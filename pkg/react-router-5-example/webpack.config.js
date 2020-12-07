// @ts-check
require("dotenv").config()
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin")

const { join, resolve } = require("path")
const { DefinePlugin } = require("webpack")

const { NODE_ENV, WDS_PORT } = process.env
const IS_PROD = NODE_ENV === "production"
const PUBLIC_DIR = join(__dirname, "public")
const DIST_DIR = resolve(PUBLIC_DIR, "dist")
const PUBLIC_OUTPUT_PATH = WDS_PORT ? `http://localhost:${WDS_PORT}/dist/` : "/dist/"

/**
 * @type { import('webpack').Configuration["stats"] }
 * */
const stats = {
  colors: true,
  assets: true,
  chunkGroups: true,
  cached: true,
  chunkGroupMaxAssets: 2,
  entrypoints: true,
}

/**
 * @type { import('webpack').Configuration }
 * */
const config = {
  cache: {
    type: "filesystem",
  },
  devServer: {
    contentBase: PUBLIC_DIR,
    publicPath: PUBLIC_OUTPUT_PATH,
    compress: false,
    port: Number(process.env.WDS_PORT),
    stats,
  },
  devtool: IS_PROD ? "source-map" : "eval-cheap-module-source-map",
  entry: {
    browser: "./src/browser.tsx",
  },
  mode: IS_PROD ? "production" : "development",
  module: {
    rules: [
      // {
      //   test: /\.js$/,
      //   use: ["source-map-loader"],
      //   enforce: "pre"
      // },
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: true,
            // happyPackMode: true,
            compilerOptions: {
              target: IS_PROD ? "ES2015" : "ES2018",
              module: "esnext",
            },
            // experimentalWatchApi: true, // https://webpack.js.org/guides/build-performance/#typescript-loader
          },
        },
        exclude: [/node_modules/],
        include: resolve(__dirname, "src"),
      },
    ],
  },
  optimization: {
    runtimeChunk: "single",
    // runtimeChunk: {
    //   name: "manifest",
    // },
    // splitChunks: {
    //   chunks: "all",
    // },
  },
  output: {
    filename: `[name].js`,
    chunkFilename: `[name].js`,
    path: DIST_DIR,
    publicPath: PUBLIC_OUTPUT_PATH,
    pathinfo: false, // https://webpack.js.org/guides/build-performance/#output-without-path-info
  },
  plugins: [
    new DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify(NODE_ENV),
        SENTRY_DSN: JSON.stringify(process.env.SENTRY_DSN),
        IS_BROWSER: "true",
      },
    }),
    new ForkTsCheckerWebpackPlugin(),
    // new Entrypoints(),
  ],
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    fallback: {
      buffer: false,
      stream: false,
      crypto: false,
    },
  },
  stats,
  watchOptions: {
    ignored: /node_modules/,
  },
}

module.exports = config
