import { Component, ReactNode, ErrorInfo } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React 错误边界捕获异常:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-error-bg)] flex items-center justify-center">
              <AlertTriangle 
                className="w-8 h-8 text-[var(--color-error)]" 
              />
            </div>
            <h2 className="text-xl font-semibold text-[var(--color-error)] mb-2">
              出现了一些问题
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-6">
              请尝试刷新页面或重新启动应用
            </p>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-[var(--color-success)] hover:opacity-90 text-white rounded-md transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}