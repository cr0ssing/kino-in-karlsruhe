/**
 * Copyright (C) 2024 Robin Lamberti.
 * 
 * This file is part of kino-in-karlsruhe.
 * 
 * kino-in-karlsruhe is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * kino-in-karlsruhe is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with kino-in-karlsruhe. If not, see <http://www.gnu.org/licenses/>.
 */

import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import tsParser from "@typescript-eslint/parser";
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';


export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  nextCoreWebVitals,
  {
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 5,
      sourceType: "script",

      parserOptions: {
        project: true,
      },
    },

    rules: {
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",

      "@typescript-eslint/consistent-type-imports": ["warn", {
        prefer: "type-imports",
        fixStyle: "inline-type-imports",
      }],

      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
      }],

      "@typescript-eslint/require-await": "off",

      "@typescript-eslint/no-misused-promises": ["error", {
        checksVoidReturn: {
          attributes: false,
        },
      }],
    },
  },
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"]
  }
);
