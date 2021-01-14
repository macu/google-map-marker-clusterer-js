module.exports = {
	mode: 'production',
	stats: 'errors-warnings',
	entry: [
		'./index.js',
	],
	output: {
		filename: 'index.js',
		path: __dirname + '/build',
		library: 'MarkerClusterer',
		libraryTarget: 'umd',
	},
	optimization: {
		minimize: true,
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /(node_modules|bower_components)/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: ['@babel/preset-env'],
						plugins: [
							'@babel/plugin-transform-classes',
						],
					},
				},
			},
		],
	},
};
