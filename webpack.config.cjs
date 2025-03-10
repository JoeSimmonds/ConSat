const path = require('path');

module.exports = {
    mode: 'development',
    entry: './src/viewer/client/reports-tree.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        filename: 'reports-tree.js',
        path: path.resolve(__dirname, 'out/viewer/public'),
        library: {
            name: 'ReportsTree',
            type: 'umd',
        },
    },
}; 