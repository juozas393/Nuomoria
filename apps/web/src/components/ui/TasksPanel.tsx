type Task = {
  text: string;
  cta: string;
  onClick: () => void;
};

type Props = {
  tasks: Task[];
};

export function TasksPanel({ tasks }: Props) {
  if (tasks.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-[13px] font-semibold text-neutral-800">Užduotys</h3>
      <div className="space-y-2">
        {tasks.map((task, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-amber-600">•</span>
              <span className="text-sm text-neutral-700">{task.text}</span>
            </div>
            <button 
              onClick={task.onClick}
              className="text-xs font-medium text-[#2F8481] hover:underline"
            >
              {task.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
