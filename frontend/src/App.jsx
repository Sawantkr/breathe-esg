import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";

function App() {

  return (

    <BrowserRouter>

      <Routes>

        {/* Login Page */}

        <Route
          path="/"
          element={<Login />}
        />

        {/* Signup Page */}

        <Route
          path="/signup"
          element={<Signup />}
        />

        {/* ESG Dashboard */}

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;