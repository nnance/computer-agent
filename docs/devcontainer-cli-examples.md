echo "complete the implementation plan in ./specs/$(git branch --show-current).md" | claude -p --output-format stream-json --verbose --dangerously-skip-permissions

npm start -- -m "explain how the agent loop works in this project"
