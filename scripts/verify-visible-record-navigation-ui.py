from __future__ import annotations

import json
import os
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import Page, sync_playwright


BASE_URL = os.environ.get("HXHWANG_VERIFY_URL", "http://127.0.0.1:4193")
ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "test-results" / "visible-record-navigation-0.7.9"


def rectangles_overlap(first: dict[str, float], second: dict[str, float]) -> bool:
    return not (
        first["right"] <= second["left"]
        or second["right"] <= first["left"]
        or first["bottom"] <= second["top"]
        or second["bottom"] <= first["top"]
    )


def normalized_text(value: str) -> str:
    return " ".join(value.split())


def inspect_navigation(page: Page, *, mobile: bool, screenshot_name: str) -> dict[str, object]:
    console_errors: list[str] = []
    page_errors: list[str] = []
    external_requests: list[str] = []
    action_requests: list[str] = []
    origin = urlparse(BASE_URL)

    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
    page.on("pageerror", lambda error: page_errors.append(str(error)))

    def record_external_request(request) -> None:
        parsed = urlparse(request.url)
        if parsed.scheme in {"data", "blob"}:
            return
        if (parsed.scheme, parsed.hostname, parsed.port) != (origin.scheme, origin.hostname, origin.port):
            external_requests.append(request.url)

    page.on("request", record_external_request)
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    page.on("request", lambda request: action_requests.append(request.url))

    page.get_by_role("button", name="任务管理", exact=True).click()
    page.get_by_label("任务管理排序").select_option("deadline:desc")
    rows = page.locator(".selectable-row")
    assert rows.count() == 2
    ordered_titles = rows.locator(".row-title strong").all_inner_texts()

    panel = page.locator(".business-detail-panel")
    panel.wait_for(state="visible")
    heading = panel.get_by_role("heading", level=2)
    position = panel.locator(".detail-record-position")
    previous = panel.locator(".detail-record-step-previous")
    next_button = panel.locator(".detail-record-step-next")

    assert ordered_titles[0] in heading.inner_text()
    assert "1 / 2" in normalized_text(position.inner_text())
    assert previous.is_disabled()
    assert next_button.is_enabled()
    assert next_button.get_attribute("aria-label") == f"查看下一条可见记录：{ordered_titles[1]}"

    next_button.focus()
    page.keyboard.press("Enter")
    assert ordered_titles[1] in heading.inner_text()
    assert "2 / 2" in normalized_text(position.inner_text())
    assert previous.is_enabled()
    assert next_button.is_disabled()
    assert rows.nth(1).get_attribute("class") is not None
    assert "selected" in (rows.nth(1).get_attribute("class") or "")

    page.wait_for_timeout(200)
    metrics = panel.evaluate(
        """
        panel => {
          const box = element => {
            const rect = element.getBoundingClientRect();
            return {
              left: rect.left,
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
              width: rect.width,
              height: rect.height
            };
          };
          const header = panel.querySelector('.detail-panel-header');
          const heading = panel.querySelector('.detail-panel-header h2');
          const status = panel.querySelector('.detail-panel-header > .status-pill');
          const navigation = panel.querySelector('.detail-record-navigation');
          const position = panel.querySelector('.detail-record-position');
          const steps = panel.querySelector('.detail-record-steps');
          const actions = panel.querySelector('.detail-panel-actions');
          return {
            panel: box(panel),
            header: box(header),
            heading: box(heading),
            status: box(status),
            navigation: box(navigation),
            position: box(position),
            steps: box(steps),
            actions: box(actions),
            buttons: [...panel.querySelectorAll('.detail-record-step')].map(box),
            body: {
              scrollWidth: document.body.scrollWidth,
              viewportWidth: window.innerWidth
            }
          };
        }
        """
    )

    assert metrics["body"]["scrollWidth"] <= metrics["body"]["viewportWidth"], metrics["body"]
    assert metrics["header"]["bottom"] <= metrics["navigation"]["top"] + 1, metrics
    assert metrics["navigation"]["bottom"] <= metrics["actions"]["top"] + 1, metrics
    assert not rectangles_overlap(metrics["heading"], metrics["status"]), metrics
    assert not rectangles_overlap(metrics["position"], metrics["steps"]), metrics
    assert metrics["navigation"]["left"] <= metrics["position"]["left"]
    assert metrics["steps"]["right"] <= metrics["navigation"]["right"]

    if mobile:
        assert all(button["width"] >= 44 and button["height"] >= 44 for button in metrics["buttons"]), metrics
        main_box = page.locator(".main-area").bounding_box()
        navigation_box = page.locator(".sidebar").bounding_box()
        assert main_box is not None and navigation_box is not None
        assert main_box["y"] + main_box["height"] <= navigation_box["y"] + 1, (main_box, navigation_box)
    else:
        assert 340 <= metrics["panel"]["width"] <= 380, metrics["panel"]

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(OUTPUT_DIR / screenshot_name), full_page=True)

    assert console_errors == [], console_errors
    assert page_errors == [], page_errors
    assert external_requests == [], external_requests
    assert action_requests == [], action_requests
    return {
        "viewport": "390x844" if mobile else "1440x900",
        "panelWidth": round(metrics["panel"]["width"], 2),
        "position": normalized_text(position.inner_text()),
        "buttonSizes": [
            {"width": round(button["width"], 2), "height": round(button["height"], 2)}
            for button in metrics["buttons"]
        ],
        "body": metrics["body"],
        "consoleErrors": console_errors,
        "pageErrors": page_errors,
        "externalRequests": external_requests,
        "actionRequests": action_requests,
        "screenshot": str(OUTPUT_DIR / screenshot_name),
    }


def main() -> None:
    results: list[dict[str, object]] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)

        desktop_context = browser.new_context(viewport={"width": 1440, "height": 900})
        results.append(
            inspect_navigation(
                desktop_context.new_page(),
                mobile=False,
                screenshot_name="visible-record-navigation-desktop-1440x900.png",
            )
        )
        desktop_context.close()

        mobile_context = browser.new_context(
            viewport={"width": 390, "height": 844},
            is_mobile=True,
            has_touch=True,
        )
        results.append(
            inspect_navigation(
                mobile_context.new_page(),
                mobile=True,
                screenshot_name="visible-record-navigation-mobile-390x844.png",
            )
        )
        mobile_context.close()
        browser.close()

    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
