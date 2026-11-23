import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
/** One malformed research section must not replace the entire Lab with an error page. */
export class ResearchBoundary extends Component<{ children: ReactNode; name: string }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() {
    if (this.state.failed) return (
      <section role="status" className="space-y-2 border-y border-border py-3">
        <p className="text-sm text-muted-foreground">{this.props.name} is temporarily unavailable.</p>
        <Button variant="outline" size="sm" onClick={() => this.setState({ failed: false })}>Try again</Button>
      </section>
    );
    return this.props.children;
  }
}