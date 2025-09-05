---
date: '2022-08-01'
title: 'Without CRA'
categories: ['TIL','React']
summary: 'React'
thumbnail: './Image/React.png'
---

# CRA 없이 초기셋팅하고 API 연동하기
## # structure

```
config 
  - webpack.common.js
  - webpack.dev.js
  - webpack.prod.js

node_modules

src
  - public
      -index.html
  -index.tsx
  -App.tsx
.babelrc
package.json
tsconfig.json
yarn.lock
```

## #명령어

```
yarn init -y
yarn add -D react react-dom
yarn -D @babel/cli @babel/core @babel/preset-env @babel/preset-react @babel/preset typescript babel-loader
yarn -D core-js css-loader css-minimizer-webpack-plugin mini-css-extract-plugin style-loader sass sass-loader terser-webpack-plugin
yarn add -D @types/react @types/react-dom typescript
```

## #setting

## webpack.common.js

const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const webpack = require("webpack");
// const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
// BundleAnalyzer는 Bundle 최적화 용도로 보통 저는 사용합니다.

module.exports = {
  entry: `${path.resolve(__dirname, "../src")}/index.tsx`,
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        use: "babel-loader",
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: `${path.resolve(__dirname, "../src/public")}/index.html`,
    }),
    new webpack.ProvidePlugin({
      React: "react",
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "..src/"),
    },
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".json"],
  },
};
```

## webpack.dev.js
```
const { merge } = require("webpack-merge");
const common = require("./webpack.common");

module.exports = merge(common, {
  mode: "development",
  devtool: "inline-source-map",
  devServer: {
    open: false,
    hot: true,
    compress: true,
    port: 8081,
    historyApiFallback: true,
    liveReload: true,
  },
  output: {
    filename: "[name].[contenthash].js",
    publicPath: "/",
  },
  module: {
    rules: [
      {
        test: /\.(sa|sc|c)ss$/i,
        use: ["style-loader", "css-loader", "sass-loader"],
      },
    ],
  },
});
```

## webpack.prod.js
```
const { merge } = require("webpack-merge");
const common = require("./webpack.common");
const path = require("path");

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = merge(common, {
  mode: "production",
  devtool: "cheap-module-source-map",
  output: {
    filename: "[name].[contenthash].js",
    path: path.resolve(__dirname, "../dist"),
    publicPath: "./",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(sa|sc|c)ss$/i,
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          "sass-loader",
        ],
      },
    ],
  },
  plugins: [new MiniCssExtractPlugin()],
  optimization: {
    usedExports: true,
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
          },
        },
      }),
      new CssMinimizerPlugin(),
    ],
    splitChunks: {
      chunks: "all",
    },
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
});
```
## .babelrc
```
{
  "presets": [
    "@babel/preset-react",
    [
      "@babel/preset-env",
      {
        "modules": false,
        "useBuiltIns": "usage",
        "corejs": 3
      }
    ],
    "@babel/preset-typescript"
  ]
}
```
## tsconfig.json
```
{
  "compilerOptions": {
    "outDir": "./dist",
    "target": "es5",
    "module": "esnext",
    "jsx": "react-jsx",
    "noImplicitAny": true,
    "allowSyntheticDefaultImports": true,
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src"]
}
```
## package.json
```
//scripts
"scripts": {
    "dev": "webpack-dev-server --config config/webpack.dev.js",
    "prod": "webpack-dev-server --config config/webpack.prod.js",
    "build:dev": "webpack --config config/webpack.dev.js",
    "build:prod": "webpack --config config/webpack.prod.js"
},

//brwoserlist
"browserslist": [
	"ie 11"
]

```
## index.html
```
<!DOCTYPE html>
<html lang="ko">
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
  />
  <head>
    <title>STARTER KIT MAKERT RYUHOJIN</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```
## index.tsx
```
import { createRoot } from "react-dom/client";
import App from "./App";

const container = document.getElementById("root");
const root = createRoot(container as Element);

root.render(<App />);

```
## App.tsx
```
const App = () => {
    return <div>Hello Hojin</div>;
}
export default App;
```


