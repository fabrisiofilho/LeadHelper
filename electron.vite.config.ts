import { resolve } from 'path';
import {
  defineConfig,
  externalizeDepsPlugin,
  swcPlugin,
  loadEnv,
} from 'electron-vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'fs';

// Plugin para copiar migrations para o build
function copyMigrationsPlugin(): { name: string; closeBundle: () => void } {
  return {
    name: 'copy-migrations',
    closeBundle(): void {
      const srcDir = resolve('src/main/infrastructure/database/migrations');
      const destDir = resolve('out/main/migrations');

      if (!existsSync(srcDir)) {
        console.warn('Migrations source directory not found:', srcDir);
        return;
      }

      // Cria o diretório de destino se não existir
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }

      // Copia todos os arquivos .sql
      const files = readdirSync(srcDir).filter((f) => f.endsWith('.sql'));
      for (const file of files) {
        copyFileSync(resolve(srcDir, file), resolve(destDir, file));
        console.log(`Copied migration: ${file}`);
      }

      console.log(`Copied ${files.length} migration files to ${destDir}`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  const API_URL = env.VITE_API_URL || 'http://localhost:8080';
  const FRONTEND_URL = env.VITE_FRONTEND_URL || 'http://localhost:5173';
  const GH_TOKEN = process.env.GH_TOKEN || '';

  console.log('Building with environment:', {
    mode,
    API_URL,
    FRONTEND_URL,
    GH_TOKEN: GH_TOKEN ? '***configured***' : 'not set',
  });

  return {
    main: {
      plugins: [
        swcPlugin(),
        externalizeDepsPlugin({
          exclude: [],
          include: ['sharp', '@img/sharp-win32-x64', '@img/sharp-wasm32'],
        }),
        copyMigrationsPlugin(),
      ],
      resolve: {
        alias: {
          '@main': resolve('src/main'),
          '@shared': resolve('src/shared'),
        },
      },
      define: {
        'process.env.VITE_API_URL': JSON.stringify(API_URL),
        'process.env.VITE_FRONTEND_URL': JSON.stringify(FRONTEND_URL),
        'process.env.GH_TOKEN': JSON.stringify(GH_TOKEN),
      },
    },

    preload: {
      plugins: [swcPlugin(), externalizeDepsPlugin()],
      resolve: {
        alias: {
          '@preload': resolve('src/preload'),
          '@shared': resolve('src/shared'),
        },
      },
    },

    renderer: {
      root: 'src/renderer',
      resolve: {
        alias: {
          '@renderer': resolve('src/renderer/src'),
          '@shared': resolve('src/shared'),
        },
      },
      plugins: [react()],
      define: {
        'import.meta.env.VITE_API_URL': JSON.stringify(API_URL),
        'import.meta.env.VITE_FRONTEND_URL': JSON.stringify(FRONTEND_URL),
      },
    },
  };
});
