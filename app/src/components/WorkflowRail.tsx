import { Check } from "lucide-react";

export interface WorkflowStep {
  label: string;
  hint: string;
}

export function WorkflowRail({
  steps,
  activeIndex,
}: {
  steps: WorkflowStep[];
  activeIndex: number;
}) {
  return (
    <div className="workflow-rail" aria-label="业务流程进度">
      {steps.map((step, index) => {
        const done = index < activeIndex;
        const current = index === activeIndex;
        return (
          <div
            className={`workflow-step ${done ? "is-done" : ""} ${current ? "is-current" : ""}`}
            key={step.label}
          >
            <span className="workflow-dot">{done ? <Check size={12} /> : index + 1}</span>
            <div className="workflow-copy">
              <strong>{step.label}</strong>
              <small>{step.hint}</small>
            </div>
            {index < steps.length - 1 ? <span className="workflow-line" /> : null}
          </div>
        );
      })}
    </div>
  );
}

