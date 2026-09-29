import { EmptyState, LmsPage, Panel } from '../../../components/lms/LmsPage';

/** LMS > Reports: per agent, source, stage and lost reason (Step 10 of LMS-plan.md). */
export default function ReportsPage() {
  return (
    <LmsPage title="Reports">
      {() => (
        <Panel>
          <EmptyState
            title="Nothing to report yet"
            text="Reports fill in once your team starts contacting leads: calls made, reach rate, wins and how fast each lead got a call."
          />
        </Panel>
      )}
    </LmsPage>
  );
}
