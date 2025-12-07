import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    layout("routes/_layout.tsx", [    
        index("routes/home.tsx"),
        route("dashboard", "routes/dashboard.tsx"),
        route("association", "routes/association.tsx"),
        route("admin", "routes/admin.tsx"),
  ]),

] satisfies RouteConfig;
