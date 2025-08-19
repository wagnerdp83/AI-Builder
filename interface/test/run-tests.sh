#!/bin/bash

# This script now runs the "Edit" method tests using ts-node.

# Install dependencies from the new package.json
echo "Installing test dependencies..."
npm install

# Run the edit method test
echo "Running Edit Method tests..."
npx ts-node run-test.ts 