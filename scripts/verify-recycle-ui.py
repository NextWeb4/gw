from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "test-results"
OUTPUT.mkdir(exist_ok=True)


def accept_next_dialog(page):
    page.once("dialog", lambda dialog: dialog.accept())


def open_recycle_with_demo_record(page):
    page.goto("http://127.0.0.1:4193")
    page.wait_for_load_state("networkidle")
    page.get_by_role("button", name="任务管理").click()
    row = page.locator(".selectable-row").filter(has_text="整理省政府办公厅来文并建立关联")
    accept_next_dialog(page)
    row.get_by_title("删除任务").click()
    page.get_by_role("button", name="回收站", exact=True).click()
    page.get_by_role("heading", name="回收站", exact=True).wait_for()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    open_recycle_with_demo_record(page)

    desktop_metrics = page.evaluate("""
      () => ({
        bodyFits: document.body.scrollWidth <= window.innerWidth,
        sidebarWidth: document.querySelector('.sidebar')?.getBoundingClientRect().width || 0,
        panelWidth: document.querySelector('.recycle-panel')?.getBoundingClientRect().width || 0,
        itemActions: [...document.querySelectorAll('.recycle-action')].map((element) => ({
          width: element.getBoundingClientRect().width,
          height: element.getBoundingClientRect().height
        }))
      })
    """)
    assert desktop_metrics["bodyFits"]
    assert desktop_metrics["sidebarWidth"] > 200
    assert desktop_metrics["panelWidth"] > 700
    page.screenshot(path=str(OUTPUT / "recycle-desktop-1440x900.png"), full_page=True)
    page.close()

    mobile_page = browser.new_page(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    open_recycle_with_demo_record(mobile_page)
    mobile_page.wait_for_timeout(150)
    mobile_metrics = mobile_page.evaluate("""
      () => {
        const sidebar = document.querySelector('.sidebar')?.getBoundingClientRect();
        const main = document.querySelector('.main-area')?.getBoundingClientRect();
        const nav = document.querySelector('.nav-list')?.getBoundingClientRect();
        const active = document.querySelector('.nav-button.active')?.getBoundingClientRect();
        return {
          bodyFits: document.body.scrollWidth <= window.innerWidth,
          mainAboveSidebar: Boolean(sidebar && main && main.bottom <= sidebar.top),
          activeNavVisible: Boolean(nav && active && active.left >= nav.left && active.right <= nav.right + 1),
          controls: [
            document.querySelector('[aria-label="搜索回收站"]'),
            document.querySelector('[aria-label="按类型筛选"]'),
            ...document.querySelectorAll('.recycle-action')
          ].filter(Boolean).map((element) => ({
            width: element.getBoundingClientRect().width,
            height: element.getBoundingClientRect().height
          }))
        };
      }
    """)
    assert mobile_metrics["bodyFits"]
    assert mobile_metrics["mainAboveSidebar"]
    assert mobile_metrics["activeNavVisible"]
    assert all(control["height"] >= 44 for control in mobile_metrics["controls"])
    mobile_page.screenshot(path=str(OUTPUT / "recycle-mobile-390x844.png"), full_page=True)
    browser.close()

print("recycle UI verified at 1440x900 and 390x844")
