import { BifrostConfig } from "@alignable/bifrost";

export default {
  documentProps: {
    title: "nested vite page",
  },
  scripts: ["<script>console.log('hello from vite-page/nested')</script>"],
} satisfies BifrostConfig;
