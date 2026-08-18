"use client";

import { Component, Fragment, type ReactNode } from "react";

import { CanvasError } from "@/components/canvas/canvas-error";

interface CanvasErrorBoundaryProps {
  children: ReactNode;
}

interface CanvasErrorBoundaryState {
  /**
   * Bumped on every retry and used as the subtree's `key`, so retrying
   * remounts the room rather than re-rendering the tree that just threw.
   */
  attempt: number;
  hasError: boolean;
}

/**
 * The error fallback for the Liveblocks room.
 *
 * Written here rather than pulled from `react-error-boundary`, which the
 * Liveblocks docs suggest: this is the only boundary in the app, it needs no
 * behaviour the library adds, and an error boundary still has to be a class
 * component either way. Not worth a production dependency and an audit-gate
 * entry for thirty lines.
 *
 * Suspense hooks — `useLiveblocksFlow({ suspense: true })` included — surface a
 * failed connection by throwing, so this catches what `ClientSideSuspense`
 * cannot. It only handles render-phase errors from the subtree; the workspace
 * page's own access check runs on the server, well before this mounts.
 */
export class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  CanvasErrorBoundaryState
> {
  state: CanvasErrorBoundaryState = { attempt: 0, hasError: false };

  static getDerivedStateFromError(): Partial<CanvasErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // A connection failure is worth a console entry — it is the only signal
    // there is that the room, rather than the app, is what broke.
    console.error("The Liveblocks canvas failed to render.", error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <CanvasError
          onRetry={() =>
            this.setState((state) => ({
              attempt: state.attempt + 1,
              hasError: false,
            }))
          }
        />
      );
    }

    // Keyed so a retry remounts the subtree — `RoomProvider` included, which is
    // what re-establishes the connection. A Fragment rather than an element: the
    // canvas sizes itself against the workspace's `<main>`, and an extra
    // wrapper in between would break that.
    return <Fragment key={this.state.attempt}>{this.props.children}</Fragment>;
  }
}
