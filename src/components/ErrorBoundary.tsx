import { Component, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

function ErrorFallback() {
  const { t } = useTranslation();
  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      role="alert"
    >
      <div className="max-w-sm w-full text-center space-y-4">
        <h1 className="text-xl font-semibold text-foreground">
          {t("common.somethingWentWrong")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("common.errorDescription")}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("common.reload")}
        </button>
      </div>
    </div>
  );
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
