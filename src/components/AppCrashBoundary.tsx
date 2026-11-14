import React from 'react';
import { AppErrorPage } from './ui/AppErrorPage';

type State = { failed: boolean };

export class AppCrashBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <AppErrorPage
      kind="unexpected"
      title="This page could not open"
      message="Please try again. If the problem continues, contact AfriClay support."
      fullPage
      onRetry={() => this.setState({ failed: false })}
    />;
    return this.props.children;
  }
}
