import { authGuard } from "@/lib/guards";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: authGuard,
  component: Index,
});

function Index() {
  return (
    <div className="p-2">
      <h3>Welcome Home!</h3>

      <ol>
        {Array(100)
          .fill("Hehe")
          .map((_, i) => (
            <li key={i}>Item #{i + 1}</li>
          ))}
      </ol>
    </div>
  );
}
