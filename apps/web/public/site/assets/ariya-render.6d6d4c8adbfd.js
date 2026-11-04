/* The film's story map, from the Rust renderer.

   A plain script rather than a module: the film keeps its story in older browsers, so
   nothing here may be a syntax error to a parser that predates modules. The page only
   fetches this once it knows it has WebAssembly, and only takes the engine over if
   `load` resolves. If it rejects — a stale ABI, a failed fetch — the JavaScript map
   in the-yes-controls.js keeps running and nothing about the film changes. */

(function () {
  var ABI_VERSION = 1;
  var INVALID = 0xffffffff;
  var WASM_URL = "/wasm/ariya_render.wasm";
  var MODE_NAMES = ["R", "M", "N", "old", "C", "G", "E", "F", "W", "J", "H", "T", "D"];

  function modeName(mode) {
    return MODE_NAMES[mode >>> 0] || "old";
  }

  function instantiate() {
    return fetch(WASM_URL).then(function (response) {
      if (!response.ok) throw new Error("renderer unavailable: " + response.status);
      return WebAssembly.instantiateStreaming
        ? WebAssembly.instantiateStreaming(response.clone(), {}).then(function (source) {
            return source.instance;
          }).catch(function () {
            // Some hosts serve .wasm as octet-stream, which the streaming API rejects.
            return response.arrayBuffer().then(function (bytes) {
              return WebAssembly.instantiate(bytes, {});
            }).then(function (source) {
              return source.instance;
            });
          })
        : response.arrayBuffer().then(function (bytes) {
            return WebAssembly.instantiate(bytes, {});
          }).then(function (source) {
            return source.instance;
          });
    });
  }

  function load() {
    return instantiate().then(function (instance) {
      var wasm = instance.exports;
      var abi = wasm.ariya_abi_version();
      if (abi !== ABI_VERSION) {
        throw new Error("renderer speaks ABI " + abi + ", expected " + ABI_VERSION);
      }

      // Eight f64s: sceneAt writes five, cutAt writes seven. One buffer, reused.
      var scratch = wasm.ariya_alloc(64);
      function floats(count) {
        return new Float64Array(wasm.memory.buffer, scratch, count);
      }

      return {
        sceneAt: function (s) {
          var mode = wasm.ariya_scene_at(s, scratch);
          var out = floats(5);
          return { mode: modeName(mode), p: out[0], local: out[1], fade: out[2], vis: out[3], cut: out[4] };
        },
        sFromScene: function (mode, k) {
          var index = typeof mode === "number" ? mode : MODE_NAMES.indexOf(mode);
          return wasm.ariya_s_from_scene(index < 0 ? INVALID : index, k);
        },
        sFromOld: function (p) {
          return wasm.ariya_s_from_old(p);
        },
        rawFromS: function (s) {
          return wasm.ariya_raw_from_s(s);
        },
        tFromS: function (s) {
          return wasm.ariya_t_from_s(s);
        },
        sFromT: function (t) {
          return wasm.ariya_s_from_t(t);
        },
        totalTime: function () {
          return wasm.ariya_total_time();
        },
      };
    });
  }

  window.AriyaRender = { load: load };
})();
