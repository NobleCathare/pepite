import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-50 p-4 font-mono text-red-900 overflow-auto">
                    <div className="bg-white p-8 rounded-xl shadow-xl border border-red-200 w-full max-w-4xl">
                        <h1 className="text-2xl font-black mb-4 flex items-center gap-2">
                            ⚠️ CRASH APPLICATION
                        </h1>
                        <div className="bg-red-100 p-4 rounded-lg mb-4 text-sm font-bold">
                            {this.state.error && this.state.error.toString()}
                        </div>
                        <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-6 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700"
                        >
                            Actualiser la page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
