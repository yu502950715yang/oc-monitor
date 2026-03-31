/**
 * Vitest 全局设置
 * 
 * 提供:
 * - CSS 变量模拟
 * - localStorage mock
 * - React Flow mock
 */

import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// ============ 全局 CSS 变量模拟 ============

// 在 jsdom 环境中设置 CSS 变量
const style = document.createElement('style')
style.textContent = `
  :root {
    /* 背景色 */
    --color-bg-primary: #0d1117;
    --color-bg-secondary: #161b22;
    --color-bg-tertiary: #21262d;
    --color-bg-elevated: #30363d;

    /* 文字色 */
    --color-text-primary: #c9d1d9;
    --color-text-secondary: #8b949e;
    --color-text-muted: #6e7681;
    --color-text-link: #58a6ff;

    /* 边框色 */
    --color-border: #30363d;
    --color-border-muted: #21262d;

    /* 语义色 - 品牌 */
    --color-primary: #58a6ff;
    --color-primary-hover: #79b8ff;
    --color-primary-active: #388bfd;

    /* 语义色 - 状态 */
    --color-success: #3fb950;
    --color-success-bg: rgba(63, 185, 80, 0.15);
    --color-warning: #d29922;
    --color-warning-bg: rgba(210, 153, 34, 0.15);
    --color-error: #f85149;
    --color-error-bg: rgba(248, 81, 73, 0.15);
    --color-info: #58a6ff;
    --color-info-bg: rgba(88, 166, 255, 0.15);

    /* 选中状态 */
    --color-selection: #388bfd;

    /* 强调色 */
    --color-accent-yellow: #e3b341;
    --color-accent-yellow-bg: rgba(227, 179, 65, 0.15);
    --color-accent-blue: #58a6ff;
    --color-accent-blue-bg: rgba(88, 166, 255, 0.15);
    --color-accent-purple: #a371f7;
    --color-accent-purple-bg: rgba(163, 113, 247, 0.15);
    --color-accent-cyan: #39d2c0;
    --color-accent-cyan-bg: rgba(57, 210, 192, 0.15);
    --color-accent-green: #3fb950;
    --color-accent-green-bg: rgba(63, 185, 80, 0.15);

    /* 过渡 */
    --transition-fast: 150ms ease-in-out;
    --transition-base: 200ms ease-in-out;
    --transition-slow: 300ms ease-in-out;
    --transition-property: background-color, border-color, color, fill, stroke, opacity, box-shadow, transform;

    /* 圆角 */
    --radius-sm: 0.25rem;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
    --radius-xl: 1rem;
    --radius-full: 9999px;

    /* 阴影 */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

    /* 字体 */
    --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --font-mono: 'SFMono-Regular', Consolas, monospace;
    --text-xs: 0.75rem;
    --text-sm: 0.875rem;
    --text-base: 1rem;
    --text-lg: 1.125rem;

    /* 间距 */
    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;

    /* 层级 */
    --z-dropdown: 100;
    --z-sticky: 200;
    --z-modal: 300;
    --z-popover: 400;
    --z-tooltip: 500;
  }
`
document.head.appendChild(style)

// ============ React Flow Mock ============

function MockReactFlow({ children }: { children?: React.ReactNode }) {
  return <div data-testid="react-flow">{children}</div>
}

function MockControls() {
  return <div data-testid="react-flow-controls" />
}

function MockBackground() {
  return <div data-testid="react-flow-background" />
}

function MockHandle() {
  return <div data-testid="react-flow-handle" />
}

vi.mock('@xyflow/react', () => ({
  ReactFlow: MockReactFlow,
  Controls: MockControls,
  Background: MockBackground,
  Handle: MockHandle,
  Position: {
    Top: 'top',
    Right: 'right',
    Bottom: 'bottom',
    Left: 'left',
  },
  useReactFlow: () => ({
    fitView: vi.fn(),
  }),
}))

// ============ ResizeObserver Mock ============

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// ============ IntersectionObserver Mock ============

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))