import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TaskBoardPage } from "@/pages/TaskBoardPage";
import { GlobalErrorBoundary } from "@/components/ErrorBoundaries/GlobalErrorBoundary";

function App() {
  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<TaskBoardPage />} />
            <Route path="/tasks" element={<TaskBoardPage />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}

export default App;
