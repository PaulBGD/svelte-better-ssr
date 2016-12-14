export default {
    entry: 'exports.js',
    dest: 'dist/app.bundle.js',
    format: 'cjs',
    plugins: [
        require('rollup-plugin-svelte')({})
    ]
};