const crypto = require("crypto");
const path = require("path");
const JavaScriptObfuscator = require("webpack-obfuscator");

function getCssName(context, _localIdentName, localName) {
  const relativePath = path.relative(context.rootContext, context.resourcePath);
  const hash = crypto
    .createHash("sha256")
    .update(`${relativePath}:${localName}`)
    .digest("base64url")
    .slice(0, 10);

  return `_${hash}`;
}

function hideCssNames(rule) {
  if (!rule || typeof rule !== "object") {
    return;
  }

  if (Array.isArray(rule.oneOf)) {
    for (const child of rule.oneOf) {
      hideCssNames(child);
    }
  }

  if (!Array.isArray(rule.use)) {
    return;
  }

  for (const item of rule.use) {
    if (
      item &&
      typeof item === "object" &&
      typeof item.loader === "string" &&
      item.loader.includes("css-loader") &&
      item.options?.modules &&
      typeof item.options.modules === "object"
    ) {
      item.options.modules.getLocalIdent = getCssName;
    }
  }
}

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
      for (const rule of config.module.rules) {
        hideCssNames(rule);
      }

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
