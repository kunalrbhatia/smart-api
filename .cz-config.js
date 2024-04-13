module.exports = {
  path: "./node_modules/cz-customizable",

  // Customize commit types with icons
  customize: {
    types: [
      { value: ":sparkles:", name: "✨  feat:        A new feature" },
      { value: ":bug:", name: "🐛  fix:         A bug fix" },
      { value: ":memo:", name: "📝  docs:        Documentation only changes" },
      { value: ":recycle:", name: "♻️  refactor:    Code refactor" },
      { value: ":white_check_mark:", name: "✅  test:        Adding tests" },
      { value: ":gear:", name: "⚙️  chore:       Changes to build process or auxiliary tools" },
      { value: ":rocket:", name: "🚀  ci:          Changes to CI configuration or scripts" },
      { value: ":art:", name: "🎨  style:       Code style changes (formatting, indentation, etc.)" },
      // Add more types with icons as needed
    ],
    // Customize other options here
  },
};
