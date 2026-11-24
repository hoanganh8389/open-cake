import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Một file HTML duy nhất: mở thẳng bằng trình duyệt, không cần máy chủ.
export default defineConfig({
	plugins: [ react(), viteSingleFile() ],
	build: { outDir: 'dist', emptyOutDir: true },
});
