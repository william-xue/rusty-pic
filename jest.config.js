/** @type {import('jest').Config} */
export default {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testMatch: [
        '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
        '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
        '<rootDir>/packages/**/__tests__/**/*.{ts,tsx}',
        '<rootDir>/packages/**/*.{test,spec}.{ts,tsx}',
    ],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        'packages/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!packages/**/*.d.ts',
        '!src/main.tsx',
        '!src/vite-env.d.ts',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            useESM: true,
        }],
    },
};