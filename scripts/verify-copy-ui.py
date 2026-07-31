from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import Page, sync_playwright


BASE_URL = "http://127.0.0.1:5173"
OUTPUT_DIR = Path("test-results")


def inspect_copy_flow(page: Page, *, mobile: bool, screenshot_name: str, save_copy: bool) -> dict[str, object]:
    console_errors: list[str] = []
    external_requests: list[str] = []
    origin = urlparse(BASE_URL)

    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)

    def record_request(request) -> None:
        parsed = urlparse(request.url)
        if parsed.scheme in {"data", "blob"}:
            return
        if (parsed.scheme, parsed.hostname, parsed.port) != (origin.scheme, origin.hostname, origin.port):
            external_requests.append(request.url)

    page.on("request", record_request)
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle")
    page.get_by_role("button", name="任务管理", exact=True).click()

    detail = page.locator(".business-detail-panel")
    copy_button = detail.get_by_role("button", name="复制相似记录", exact=True)
    copy_button.wait_for(state="visible")
    button_box = copy_button.bounding_box()
    assert button_box is not None
    if mobile:
        assert button_box["height"] >= 44, button_box

    row_count_before = page.locator(".selectable-row").count()
    copy_button.click()
    dialog = page.get_by_role("dialog", name="复制任务为新记录")
    dialog.wait_for(state="visible")
    assert dialog.get_by_text("这是未保存的新记录", exact=True).is_visible()
    assert dialog.get_by_role("combobox").first.input_value() == "pending"
    assert dialog.get_by_label("工作小结").input_value() == ""
    assert dialog.get_by_text("未保存修改", exact=True).is_visible()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(OUTPUT_DIR / screenshot_name), full_page=True)

    if save_copy:
        page.get_by_label("任务名称").fill("真实浏览器复制验证任务")
        dialog.get_by_role("button", name="保存任务").click()
        page.locator(".selectable-row").filter(has_text="真实浏览器复制验证任务").wait_for(state="visible")
        assert "真实浏览器复制验证任务" in detail.get_by_role("heading", level=2).inner_text()
        assert page.locator(".selectable-row").filter(has_text="推进全省基层治理年度工作总结").is_visible()
    else:
        page.once("dialog", lambda confirmation: confirmation.accept())
        dialog.get_by_role("button", name="关闭").click()
        dialog.wait_for(state="detached")
        assert page.locator(".selectable-row").count() == row_count_before

    body_metrics = page.locator("body").evaluate(
        "body => ({ scrollWidth: body.scrollWidth, viewportWidth: window.innerWidth })"
    )
    assert body_metrics["scrollWidth"] <= body_metrics["viewportWidth"], body_metrics

    if mobile:
        main_box = page.locator(".main-area").bounding_box()
        navigation_box = page.locator(".sidebar").bounding_box()
        assert main_box is not None and navigation_box is not None
        assert main_box["y"] + main_box["height"] <= navigation_box["y"] + 1, (main_box, navigation_box)

    assert console_errors == [], console_errors
    assert external_requests == [], external_requests
    return {
        "mobile": mobile,
        "copyButtonHeight": round(button_box["height"], 2),
        "body": body_metrics,
        "consoleErrors": console_errors,
        "externalRequests": external_requests,
        "savedCopy": save_copy,
    }


def main() -> None:
    results: list[dict[str, object]] = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        desktop_context = browser.new_context(viewport={"width": 1440, "height": 900})
        results.append(
            inspect_copy_flow(
                desktop_context.new_page(),
                mobile=False,
                screenshot_name="copy-record-desktop-1440x900.png",
                save_copy=True,
            )
        )
        desktop_context.close()

        mobile_context = browser.new_context(
            viewport={"width": 390, "height": 844},
            is_mobile=True,
            has_touch=True,
        )
        results.append(
            inspect_copy_flow(
                mobile_context.new_page(),
                mobile=True,
                screenshot_name="copy-record-mobile-390x844.png",
                save_copy=False,
            )
        )
        mobile_context.close()
        browser.close()

    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
