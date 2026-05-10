const JavaScriptObfuscator = require("webpack-obfuscator");

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", "*.preview.same-app.com"],
  devIndicators: false,
  productionBrowserSourceMaps: false,
  images: {
    unoptimized: true,
    domains: [
      "source.unsplash.com",
      "images.unsplash.com",
      "ext.same-assets.com",
      "ugc.same-assets.com",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "source.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ext.same-assets.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ugc.same-assets.com",
        pathname: "/**",
      },
    ],
  },
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.plugins.push(
        new JavaScriptObfuscator(
          {
            compact: true,
            controlFlowFlattening: false,
            deadCodeInjection: false,
            debugProtection: false,
            disableConsoleOutput: true,
            identifierNamesGenerator: "hexadecimal",
            renameGlobals: false,
            rotateStringArray: true,
            selfDefending: false,
            simplify: true,
            splitStrings: false,
            stringArray: true,
            stringArrayCallsTransform: true,
            stringArrayEncoding: ["base64"],
            stringArrayThreshold: 0.75,
            transformObjectKeys: true,
            unicodeEscapeSequence: false,
          },
          [
            "**/framework-*.js",
            "**/main-*.js",
            "**/webpack-*.js",
            "**/polyfills-*.js",
          ],
        ),
      );
    }

    return config;
  },
};

module.exports = nextConfig;
