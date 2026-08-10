// vite.config.ts
import { sveltekit } from "file:///C:/Users/shiva/.gemini/antigravity/scratch/tarotoutmyheart/node_modules/@sveltejs/kit/src/exports/vite/index.js";
import { defineConfig } from "file:///C:/Users/shiva/.gemini/antigravity/scratch/tarotoutmyheart/node_modules/vitest/dist/config.js";
var vite_config_default = defineConfig({
  plugins: [sveltekit()],
  server: {
    fs: {
      allow: [".", "./contracts", "./services"]
    }
  },
  test: {
    // Include test files
    include: ["src/**/*.{test,spec}.{js,ts}", "tests/**/*.{test,spec}.{js,ts}"],
    // Test environment
    environment: "jsdom",
    // Global test setup
    globals: true,
    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", ".svelte-kit/", "build/", "tests/", "*.config.*"]
    }
  },
  // Resolve path aliases (matches svelte.config.js)
  resolve: {
    alias: {
      $contracts: "./contracts",
      $services: "./services",
      $lib: "./src/lib"
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxzaGl2YVxcXFwuZ2VtaW5pXFxcXGFudGlncmF2aXR5XFxcXHNjcmF0Y2hcXFxcdGFyb3RvdXRteWhlYXJ0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxzaGl2YVxcXFwuZ2VtaW5pXFxcXGFudGlncmF2aXR5XFxcXHNjcmF0Y2hcXFxcdGFyb3RvdXRteWhlYXJ0XFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9zaGl2YS8uZ2VtaW5pL2FudGlncmF2aXR5L3NjcmF0Y2gvdGFyb3RvdXRteWhlYXJ0L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgc3ZlbHRla2l0IH0gZnJvbSAnQHN2ZWx0ZWpzL2tpdC92aXRlJ1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZXN0L2NvbmZpZydcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3N2ZWx0ZWtpdCgpXSxcblxuICBzZXJ2ZXI6IHtcbiAgICBmczoge1xuICAgICAgYWxsb3c6IFsnLicsICcuL2NvbnRyYWN0cycsICcuL3NlcnZpY2VzJ10sXG4gICAgfSxcbiAgfSxcblxuICB0ZXN0OiB7XG4gICAgLy8gSW5jbHVkZSB0ZXN0IGZpbGVzXG4gICAgaW5jbHVkZTogWydzcmMvKiovKi57dGVzdCxzcGVjfS57anMsdHN9JywgJ3Rlc3RzLyoqLyoue3Rlc3Qsc3BlY30ue2pzLHRzfSddLFxuXG4gICAgLy8gVGVzdCBlbnZpcm9ubWVudFxuICAgIGVudmlyb25tZW50OiAnanNkb20nLFxuXG4gICAgLy8gR2xvYmFsIHRlc3Qgc2V0dXBcbiAgICBnbG9iYWxzOiB0cnVlLFxuXG4gICAgLy8gQ292ZXJhZ2UgY29uZmlndXJhdGlvblxuICAgIGNvdmVyYWdlOiB7XG4gICAgICBwcm92aWRlcjogJ3Y4JyxcbiAgICAgIHJlcG9ydGVyOiBbJ3RleHQnLCAnanNvbicsICdodG1sJ10sXG4gICAgICBleGNsdWRlOiBbJ25vZGVfbW9kdWxlcy8nLCAnLnN2ZWx0ZS1raXQvJywgJ2J1aWxkLycsICd0ZXN0cy8nLCAnKi5jb25maWcuKiddLFxuICAgIH0sXG4gIH0sXG5cbiAgLy8gUmVzb2x2ZSBwYXRoIGFsaWFzZXMgKG1hdGNoZXMgc3ZlbHRlLmNvbmZpZy5qcylcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAkY29udHJhY3RzOiAnLi9jb250cmFjdHMnLFxuICAgICAgJHNlcnZpY2VzOiAnLi9zZXJ2aWNlcycsXG4gICAgICAkbGliOiAnLi9zcmMvbGliJyxcbiAgICB9LFxuICB9LFxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBOFcsU0FBUyxpQkFBaUI7QUFDeFksU0FBUyxvQkFBb0I7QUFFN0IsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLFVBQVUsQ0FBQztBQUFBLEVBRXJCLFFBQVE7QUFBQSxJQUNOLElBQUk7QUFBQSxNQUNGLE9BQU8sQ0FBQyxLQUFLLGVBQWUsWUFBWTtBQUFBLElBQzFDO0FBQUEsRUFDRjtBQUFBLEVBRUEsTUFBTTtBQUFBO0FBQUEsSUFFSixTQUFTLENBQUMsZ0NBQWdDLGdDQUFnQztBQUFBO0FBQUEsSUFHMUUsYUFBYTtBQUFBO0FBQUEsSUFHYixTQUFTO0FBQUE7QUFBQSxJQUdULFVBQVU7QUFBQSxNQUNSLFVBQVU7QUFBQSxNQUNWLFVBQVUsQ0FBQyxRQUFRLFFBQVEsTUFBTTtBQUFBLE1BQ2pDLFNBQVMsQ0FBQyxpQkFBaUIsZ0JBQWdCLFVBQVUsVUFBVSxZQUFZO0FBQUEsSUFDN0U7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUdBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLFlBQVk7QUFBQSxNQUNaLFdBQVc7QUFBQSxNQUNYLE1BQU07QUFBQSxJQUNSO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
