#!/bin/bash

set -euo pipefail

TAG_PREFIX="probekit-linux-amd64-api-go"

last_tag=$(git describe --tags --abbrev=0 \
            --match "${TAG_PREFIX}-[0-9]*.[0-9]*.[0-9]*" 2>/dev/null || true)

if [ -z "$last_tag" ]; then
    echo "version=1.0.0" >> "$GITHUB_OUTPUT"
    echo "release=true" >> "$GITHUB_OUTPUT"
    exit 0
fi

IFS='.' read -r major minor patch <<< "${last_tag#${TAG_PREFIX}-}"

changes=$(git log "${last_tag}..HEAD" \
    --format='%B' -- \
    backend/api-service-golang/)

bump="none"

if grep -Eq 'BREAKING CHANGE:|^[a-z]+(\([^)]+\))?!:' <<< "$changes"; then
    bump="major"
elif grep -Eq '^feat(\([^)]+\))?:' <<< "$changes"; then
    bump="minor"
elif grep -Eq '^(fix|perf)(\([^)]+\))?:' <<< "$changes"; then
    bump="patch"
fi

case "$bump" in
    major)
        major=$((major + 1))
        minor=0
        patch=0
        ;;
    minor)
        minor=$((minor + 1))
        patch=0
        ;;
    patch)
        patch=$((patch + 1))
        ;;
esac

echo "version=${major}.${minor}.${patch}" >> "$GITHUB_OUTPUT"

if [ "$bump" = "none" ]; then
    echo "release=false" >> "$GITHUB_OUTPUT"
else
    echo "release=true" >> "$GITHUB_OUTPUT"
fi

