import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Demo from "@/pages/Demo";
import CLI from "@/pages/CLI";
import API from "@/pages/API";
import VitePlugin from "@/pages/VitePlugin";
import Docs from "@/pages/Docs";
import Layout from "@/components/Layout";

export default function App() {
  const basename = import.meta.env.PROD ? '/rusty-pic' : '';

  return (
    <Router basename={basename}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="demo" element={<Demo />} />
          <Route path="cli" element={<CLI />} />
          <Route path="api" element={<API />} />
          <Route path="vite-plugin" element={<VitePlugin />} />
          <Route path="docs" element={<Docs />} />
        </Route>
      </Routes>
    </Router>
  );
}
