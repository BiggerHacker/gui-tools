const { getProjectPath, resolve, injectRequire } = require('./utils/projectHelper'); // eslint-disable-line import/order

injectRequire();


process.traceDeprecation = true;

// Normal requirement
const path = require('path');
const webpack = require('webpack');
const WebpackBar = require('webpackbar');
const webpackMerge = require('webpack-merge');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const FilterWarningsPlugin = require('webpack-filter-warnings-plugin');
const postcssConfig = require('./postcssConfig');
const CleanUpStatsPlugin = require('./utils/CleanUpStatsPlugin');

const svgRegex = /\.svg(\?v=\d+\.\d+\.\d+)?$/;
const svgOptions = {
  limit: 10000,
  minetype: 'image/svg+xml',
};

const imageOptions = {
  limit: 10000,
};

function getWebpackConfig(modules) {
  const pkg = require(getProjectPath('package.json'));
  const babelConfig = require('./getBabelCommonConfig')(modules || false);


  babelConfig.plugins.push([
    resolve('babel-plugin-import'),
    {
      style: true,
      libraryName: pkg.name,
      libraryDirectory: 'components',
    },
  ]);

  // Other package
  if (pkg.name !== 'gui') {
    babelConfig.plugins.push([
      resolve('babel-plugin-import'),
      {
        style: 'css',
        libraryDirectory: 'es',
        libraryName: 'gui',
      },
      'other-package-babel-plugin-import',
    ]);
  }

  if (modules === false) {
    babelConfig.plugins.push(require.resolve('./replaceLib'));
  }

  const config = {
    devtool: 'source-map',

    output: {
      path: getProjectPath('./dist/'),
      filename: '[name].js',
    },

    resolve: {
      modules: ['node_modules', path.join(__dirname, '../node_modules')],
      extensions: [
        '.web.tsx',
        '.web.ts',
        '.web.jsx',
        '.web.js',
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.json',
      ],
      alias: {
        [pkg.name]: process.cwd(),
      },
    },

    node: [
      'child_process',
      'cluster',
      'dgram',
      'dns',
      'fs',
      'module',
      'net',
      'readline',
      'repl',
      'tls',
    ].reduce(
      (acc, name) => ({
        ...acc,
        [name]: 'empty',
      }),
      {}
    ),

    module: {
      noParse: [/moment.js/],
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          loader: resolve('babel-loader'),
          options: babelConfig,
        },
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: resolve('babel-loader'),
              options: babelConfig,
            },
            {
              loader: resolve('ts-loader'),
              options: {
                transpileOnly: true,
              },
            },
          ],
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                sourceMap: true,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                ...postcssConfig,
                sourceMap: true,
              },
            },
          ],
        },
        {
          test: /\.less$/,
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                sourceMap: true,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                ...postcssConfig,
                sourceMap: true,
              },
            },
            {
              loader: resolve('less-loader'),
              options: {
                javascriptEnabled: true,
                sourceMap: true,
              },
            },
          ],
        },

        // Images
        {
          test: svgRegex,
          loader: 'url-loader',
          options: svgOptions,
        },
        {
          test: /\.(png|jpg|jpeg|gif)(\?v=\d+\.\d+\.\d+)?$/i,
          loader: 'url-loader',
          options: imageOptions,
        },
      ],
    },

    plugins: [
      new CaseSensitivePathsPlugin(),
      new webpack.BannerPlugin(`
${pkg.name} v${pkg.version}
Copyright 2015-present, gui, Inc.
All rights reserved.
      `),
      new WebpackBar({
        name: '😂 Gui Tools',
        color: '#2f54eb',
      }),
      new CleanUpStatsPlugin(),
      new FilterWarningsPlugin({
        exclude: /mini-css-extract-plugin[^]*Conflicting order between:/,
      }),
    ],

    performance: {
      hints: false,
    },
  };

  if (process.env.RUN_ENV === 'PRODUCTION') {
    const entry = ['./index'];

    // Common config
    config.externals = {
      react: {
        root: 'React',
        commonjs2: 'react',
        commonjs: 'react',
        amd: 'react',
      },
      'react-dom': {
        root: 'ReactDOM',
        commonjs2: 'react-dom',
        commonjs: 'react-dom',
        amd: 'react-dom',
      },
    };
    config.output.library = pkg.name;
    config.output.libraryTarget = 'umd';
    config.optimization = {
      minimizer: [
        new UglifyJsPlugin({
          cache: true,
          parallel: true,
          sourceMap: true,
          uglifyOptions: {
            warnings: false,
          },
        }),
      ],
    };

    // Development
    const uncompressedConfig = webpackMerge({}, config, {
      entry: {
        [pkg.name]: entry,
      },
      mode: 'development',
      plugins: [
        new MiniCssExtractPlugin({
          filename: '[name].css',
        }),
      ],
    });

    // Production
    const prodConfig = webpackMerge({}, config, {
      entry: {
        [`${pkg.name}.min`]: entry,
      },
      mode: 'production',
      plugins: [
        new webpack.optimize.ModuleConcatenationPlugin(),
        new webpack.LoaderOptionsPlugin({
          minimizer: true,
        }),
        new MiniCssExtractPlugin({
          filename: '[name].css',
        }),
      ],
      optimization: {
        minimizer: [new OptimizeCSSAssetsPlugin({})],
      },
    });

    return [prodConfig, uncompressedConfig];
  }

  return config;
}

getWebpackConfig.webpack = webpack;
getWebpackConfig.svgRegex = svgRegex;
getWebpackConfig.svgOptions = svgOptions;
getWebpackConfig.imageOptions = imageOptions;

module.exports = getWebpackConfig;
