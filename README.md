# Infoplaza Platform — Examples

Example implementations for the [Infoplaza Platform API](https://platform.infoplaza.com/) — your gateway to weather, geo and mobility data.

## About the Infoplaza Platform

The [Infoplaza Platform](https://platform.infoplaza.com/) offers a unified set of APIs with consistent authentication, documentation and response formats:

- **Weather APIs** — forecasts, historical data and real-time observations worldwide, with 100+ weather elements (temperature, precipitation, air quality, radiation, pollen and more) powered by 40+ weather models.
- **Geo APIs** — location-based data including geocoding, reverse geocoding and spatial search.
- **Mobility APIs** — real-time transit data, traffic information and route planning.

Full API documentation is available at [platform.infoplaza.com/docs](https://platform.infoplaza.com/docs).

## Implementations

This repository contains example implementations for various platforms and frameworks. Each implementation lives in its own folder and demonstrates how to integrate the Infoplaza Platform API.

| Platform | Folder | Status |
| --- | --- | --- |
| Next.js | [nextjs](./nextjs) | ✅ Available |
| Android | [android](./android) | 📅 Planned |
| iOS | [ios](./ios) | 📅 Planned |

The runnable code lives in [nextjs](./nextjs); it needs [Node.js](https://nodejs.org/) 22 or later.

## Getting started

1. Sign up at [platform.infoplaza.com](https://platform.infoplaza.com/) to obtain an API key.
2. Pick the implementation for your platform from the table above.
3. Follow the README in that folder to run the example.

> **Note:** Never commit your API key. Each example uses environment variables (or the platform's equivalent) to keep credentials out of source control.

## Contributing

Contributions are welcome! If you'd like to improve an example or add an implementation for a new platform, see [CONTRIBUTING.md](./CONTRIBUTING.md).

To report a security issue, see [SECURITY.md](./SECURITY.md).

## License

The example code in this repository is released under the MIT License — see [LICENSE](./LICENSE).

The licence covers this example code only, not the API it calls: see the Infoplaza Platform [terms of service](https://platform.infoplaza.com/) for API usage conditions.
