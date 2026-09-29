import { EmptyState, LmsPage, Panel } from '../../../components/lms/LmsPage';

/** LMS > Tasks: callbacks, retries, meetings and visits (Step 6 of LMS-plan.md). */
export default function TasksPage() {
  return (
    <LmsPage title="Tasks">
      {() => (
        <Panel>
          <EmptyState
            title="No tasks yet"
            text="Callbacks and follow-ups your team schedules will show up here, with the overdue ones first."
          />
        </Panel>
      )}
    </LmsPage>
  );
}
