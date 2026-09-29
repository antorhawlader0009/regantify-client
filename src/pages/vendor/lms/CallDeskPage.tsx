import { EmptyState, LmsPage, Panel } from '../../../components/lms/LmsPage';

/** LMS > Call Desk: one lead at a time with the outcome keypad (Step 4 of LMS-plan.md). */
export default function CallDeskPage() {
  return (
    <LmsPage title="Call Desk">
      {() => (
        <Panel>
          <EmptyState title="You're all caught up" text="New leads will appear here, one at a time, ready to call." />
        </Panel>
      )}
    </LmsPage>
  );
}
