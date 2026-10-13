(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/.pnpm/react@19.3.0/node_modules/react/cjs/react.development.js
  var require_react_development = __commonJS({
    "node_modules/.pnpm/react@19.3.0/node_modules/react/cjs/react.development.js"(exports, module) {
      "use strict";
      (function() {
        function defineDeprecationWarning(methodName, info) {
          Object.defineProperty(Component.prototype, methodName, {
            get: function() {
              console.warn(
                "%s(...) is deprecated in plain JavaScript React classes. %s",
                info[0],
                info[1]
              );
            }
          });
        }
        function getIteratorFn(maybeIterable) {
          if (null === maybeIterable || "object" !== typeof maybeIterable)
            return null;
          maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
          return "function" === typeof maybeIterable ? maybeIterable : null;
        }
        function warnNoop(publicInstance, callerName) {
          publicInstance = (publicInstance = publicInstance.constructor) && (publicInstance.displayName || publicInstance.name) || "ReactClass";
          var warningKey = publicInstance + "." + callerName;
          didWarnStateUpdateForUnmountedComponent[warningKey] || (console.error(
            "Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.",
            callerName,
            publicInstance
          ), didWarnStateUpdateForUnmountedComponent[warningKey] = true);
        }
        function Component(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        function ComponentDummy() {
        }
        function PureComponent(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        function noop2() {
        }
        function testStringCoercion(value) {
          return "" + value;
        }
        function checkKeyStringCoercion(value) {
          try {
            testStringCoercion(value);
            var JSCompiler_inline_result = false;
          } catch (e) {
            JSCompiler_inline_result = true;
          }
          if (JSCompiler_inline_result) {
            JSCompiler_inline_result = console;
            var JSCompiler_temp_const = JSCompiler_inline_result.error;
            var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            JSCompiler_temp_const.call(
              JSCompiler_inline_result,
              "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
              JSCompiler_inline_result$jscomp$0
            );
            return testStringCoercion(value);
          }
        }
        function getComponentNameFromType(type) {
          if (null == type) return null;
          if ("function" === typeof type)
            return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
          if ("string" === typeof type) return type;
          switch (type) {
            case REACT_FRAGMENT_TYPE:
              return "Fragment";
            case REACT_PROFILER_TYPE:
              return "Profiler";
            case REACT_STRICT_MODE_TYPE:
              return "StrictMode";
            case REACT_SUSPENSE_TYPE:
              return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
              return "SuspenseList";
            case REACT_ACTIVITY_TYPE:
              return "Activity";
            case REACT_VIEW_TRANSITION_TYPE:
              return "ViewTransition";
          }
          if ("object" === typeof type)
            switch ("number" === typeof type.tag && console.error(
              "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
            ), type.$$typeof) {
              case REACT_PORTAL_TYPE:
                return "Portal";
              case REACT_CONTEXT_TYPE:
                return type.displayName || "Context";
              case REACT_CONSUMER_TYPE:
                return (type._context.displayName || "Context") + ".Consumer";
              case REACT_FORWARD_REF_TYPE:
                var innerType = type.render;
                type = type.displayName;
                type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
                return type;
              case REACT_MEMO_TYPE:
                return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
              case REACT_LAZY_TYPE:
                innerType = type._payload;
                type = type._init;
                try {
                  return getComponentNameFromType(type(innerType));
                } catch (x) {
                }
            }
          return null;
        }
        function getTaskName(type) {
          if (type === REACT_FRAGMENT_TYPE) return "<>";
          if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE)
            return "<...>";
          try {
            var name = getComponentNameFromType(type);
            return name ? "<" + name + ">" : "<...>";
          } catch (x) {
            return "<...>";
          }
        }
        function getOwner() {
          var dispatcher = ReactSharedInternals.A;
          return null === dispatcher ? null : dispatcher.getOwner();
        }
        function UnknownOwner() {
          return Error("react-stack-top-frame");
        }
        function hasValidKey(config) {
          if (hasOwnProperty.call(config, "key")) {
            var getter = Object.getOwnPropertyDescriptor(config, "key").get;
            if (getter && getter.isReactWarning) return false;
          }
          return void 0 !== config.key;
        }
        function defineKeyPropWarningGetter(props, displayName) {
          function warnAboutAccessingKey() {
            specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error(
              "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
              displayName
            ));
          }
          warnAboutAccessingKey.isReactWarning = true;
          Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: true
          });
        }
        function elementRefGetterWithDeprecationWarning() {
          var componentName = getComponentNameFromType(this.type);
          didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error(
            "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
          ));
          componentName = this.props.ref;
          return void 0 !== componentName ? componentName : null;
        }
        function ReactElement(type, key, props, owner, debugStack, debugTask) {
          var refProp = props.ref;
          type = {
            $$typeof: REACT_ELEMENT_TYPE,
            type,
            key,
            props,
            _owner: owner
          };
          null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
            enumerable: false,
            get: elementRefGetterWithDeprecationWarning
          }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
          type._store = {};
          Object.defineProperty(type._store, "validated", {
            configurable: false,
            enumerable: false,
            writable: true,
            value: 0
          });
          Object.defineProperty(type, "_debugInfo", {
            configurable: false,
            enumerable: false,
            writable: true,
            value: null
          });
          Object.defineProperty(type, "_debugStack", {
            configurable: false,
            enumerable: false,
            writable: true,
            value: debugStack
          });
          Object.defineProperty(type, "_debugTask", {
            configurable: false,
            enumerable: false,
            writable: true,
            value: debugTask
          });
          Object.freeze && (Object.freeze(type.props), Object.freeze(type));
          return type;
        }
        function cloneAndReplaceKey(oldElement, newKey) {
          newKey = ReactElement(
            oldElement.type,
            newKey,
            oldElement.props,
            oldElement._owner,
            oldElement._debugStack,
            oldElement._debugTask
          );
          oldElement._store && (newKey._store.validated = oldElement._store.validated);
          return newKey;
        }
        function validateChildKeys(node) {
          isValidElement2(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement2(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
        }
        function isValidElement2(object) {
          return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
        }
        function escape2(key) {
          var escaperLookup = { "=": "=0", ":": "=2" };
          return "$" + key.replace(/[=:]/g, function(match) {
            return escaperLookup[match];
          });
        }
        function getElementKey(element, index2) {
          return "object" === typeof element && null !== element && null != element.key ? (checkKeyStringCoercion(element.key), escape2("" + element.key)) : index2.toString(36);
        }
        function resolveThenable(thenable) {
          switch (thenable.status) {
            case "fulfilled":
              return thenable.value;
            case "rejected":
              throw thenable.reason;
            default:
              switch ("string" === typeof thenable.status ? thenable.then(noop2, noop2) : (thenable.status = "pending", thenable.then(
                function(fulfilledValue) {
                  "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
                },
                function(error) {
                  "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
                }
              )), thenable.status) {
                case "fulfilled":
                  return thenable.value;
                case "rejected":
                  throw thenable.reason;
              }
          }
          throw thenable;
        }
        function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
          var type = typeof children;
          if ("undefined" === type || "boolean" === type) children = null;
          var invokeCallback = false;
          if (null === children) invokeCallback = true;
          else
            switch (type) {
              case "bigint":
              case "string":
              case "number":
                invokeCallback = true;
                break;
              case "object":
                switch (children.$$typeof) {
                  case REACT_ELEMENT_TYPE:
                  case REACT_PORTAL_TYPE:
                    invokeCallback = true;
                    break;
                  case REACT_LAZY_TYPE:
                    return invokeCallback = children._init, mapIntoArray(
                      invokeCallback(children._payload),
                      array,
                      escapedPrefix,
                      nameSoFar,
                      callback
                    );
                }
            }
          if (invokeCallback) {
            invokeCallback = children;
            callback = callback(invokeCallback);
            var childKey = "" === nameSoFar ? "." + getElementKey(invokeCallback, 0) : nameSoFar;
            isArrayImpl(callback) ? (escapedPrefix = "", null != childKey && (escapedPrefix = childKey.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
              return c;
            })) : null != callback && (isValidElement2(callback) && (null != callback.key && (invokeCallback && invokeCallback.key === callback.key || checkKeyStringCoercion(callback.key)), escapedPrefix = cloneAndReplaceKey(
              callback,
              escapedPrefix + (null == callback.key || invokeCallback && invokeCallback.key === callback.key ? "" : ("" + callback.key).replace(
                userProvidedKeyEscapeRegex,
                "$&/"
              ) + "/") + childKey
            ), "" !== nameSoFar && null != invokeCallback && isValidElement2(invokeCallback) && null == invokeCallback.key && invokeCallback._store && !invokeCallback._store.validated && (escapedPrefix._store.validated = 2), callback = escapedPrefix), array.push(callback));
            return 1;
          }
          invokeCallback = 0;
          childKey = "" === nameSoFar ? "." : nameSoFar + ":";
          if (isArrayImpl(children))
            for (var i = 0; i < children.length; i++)
              nameSoFar = children[i], type = childKey + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
                nameSoFar,
                array,
                escapedPrefix,
                type,
                callback
              );
          else if (i = getIteratorFn(children), "function" === typeof i)
            for (i === children.entries && (didWarnAboutMaps || console.warn(
              "Using Maps as children is not supported. Use an array of keyed ReactElements instead."
            ), didWarnAboutMaps = true), children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
              nameSoFar = nameSoFar.value, type = childKey + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
                nameSoFar,
                array,
                escapedPrefix,
                type,
                callback
              );
          else if ("object" === type) {
            if ("function" === typeof children.then)
              return mapIntoArray(
                resolveThenable(children),
                array,
                escapedPrefix,
                nameSoFar,
                callback
              );
            array = String(children);
            throw Error(
              "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
            );
          }
          return invokeCallback;
        }
        function mapChildren(children, func, context) {
          if (null == children) return children;
          var result = [], count = 0;
          mapIntoArray(children, result, "", "", function(child) {
            return func.call(context, child, count++);
          });
          return result;
        }
        function lazyInitializer(payload) {
          if (-1 === payload._status) {
            var resolveDebugValue = null, rejectDebugValue = null, ioInfo = payload._ioInfo;
            null != ioInfo && (ioInfo.start = ioInfo.end = performance.now(), ioInfo.value = new Promise(function(resolve, reject) {
              resolveDebugValue = resolve;
              rejectDebugValue = reject;
            }));
            ioInfo = payload._result;
            var thenable = ioInfo();
            thenable.then(
              function(moduleObject) {
                if (0 === payload._status || -1 === payload._status) {
                  payload._status = 1;
                  payload._result = moduleObject;
                  var _ioInfo = payload._ioInfo;
                  if (null != _ioInfo) {
                    _ioInfo.end = performance.now();
                    var debugValue = null == moduleObject ? void 0 : moduleObject.default;
                    resolveDebugValue(debugValue);
                    _ioInfo.value.status = "fulfilled";
                    _ioInfo.value.value = debugValue;
                  }
                  void 0 === thenable.status && (thenable.status = "fulfilled", thenable.value = moduleObject);
                }
              },
              function(error) {
                if (0 === payload._status || -1 === payload._status) {
                  payload._status = 2;
                  payload._result = error;
                  var _ioInfo2 = payload._ioInfo;
                  null != _ioInfo2 && (_ioInfo2.end = performance.now(), _ioInfo2.value.then(noop2, noop2), rejectDebugValue(error), _ioInfo2.value.status = "rejected", _ioInfo2.value.reason = error);
                  void 0 === thenable.status && (thenable.status = "rejected", thenable.reason = error);
                }
              }
            );
            ioInfo = payload._ioInfo;
            if (null != ioInfo) {
              var displayName = thenable.displayName;
              "string" === typeof displayName && (ioInfo.name = displayName);
            }
            -1 === payload._status && (payload._status = 0, payload._result = thenable);
          }
          if (1 === payload._status)
            return ioInfo = payload._result, void 0 === ioInfo && console.error(
              "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?",
              ioInfo
            ), "default" in ioInfo || console.error(
              "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))",
              ioInfo
            ), ioInfo.default;
          throw payload._result;
        }
        function resolveDispatcher() {
          var dispatcher = ReactSharedInternals.H;
          null === dispatcher && console.error(
            "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem."
          );
          return dispatcher;
        }
        function releaseAsyncTransition() {
          ReactSharedInternals.asyncTransitions--;
        }
        function startTransition(scope) {
          var prevTransition = ReactSharedInternals.T, currentTransition = {};
          currentTransition.types = null !== prevTransition ? prevTransition.types : null;
          currentTransition._updatedFibers = /* @__PURE__ */ new Set();
          ReactSharedInternals.T = currentTransition;
          try {
            var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
            null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
            "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && (ReactSharedInternals.asyncTransitions++, returnValue.then(releaseAsyncTransition, releaseAsyncTransition), returnValue.then(noop2, reportGlobalError));
          } catch (error) {
            reportGlobalError(error);
          } finally {
            null === prevTransition && currentTransition._updatedFibers && (scope = currentTransition._updatedFibers.size, currentTransition._updatedFibers.clear(), 10 < scope && console.warn(
              "Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table."
            )), null !== prevTransition && null !== currentTransition.types && (null !== prevTransition.types && prevTransition.types !== currentTransition.types && console.error(
              "We expected inner Transitions to have transferred the outer types set and that you cannot add to the outer Transition while inside the inner.This is a bug in React."
            ), prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
          }
        }
        function addTransitionType(type) {
          var transition = ReactSharedInternals.T;
          if (null !== transition) {
            var transitionTypes = transition.types;
            null === transitionTypes ? transition.types = [type] : -1 === transitionTypes.indexOf(type) && transitionTypes.push(type);
          } else
            0 === ReactSharedInternals.asyncTransitions && console.error(
              "addTransitionType can only be called inside a `startTransition()` callback. It must be associated with a specific Transition."
            ), startTransition(addTransitionType.bind(null, type));
        }
        function enqueueTask(task) {
          if (null === enqueueTaskImpl)
            try {
              var requireString = ("require" + Math.random()).slice(0, 7);
              enqueueTaskImpl = (module && module[requireString]).call(
                module,
                "timers"
              ).setImmediate;
            } catch (_err) {
              enqueueTaskImpl = function(callback) {
                false === didWarnAboutMessageChannel && (didWarnAboutMessageChannel = true, "undefined" === typeof MessageChannel && console.error(
                  "This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning."
                ));
                var channel = new MessageChannel();
                channel.port1.onmessage = callback;
                channel.port2.postMessage(void 0);
              };
            }
          return enqueueTaskImpl(task);
        }
        function aggregateErrors(errors2) {
          return 1 < errors2.length && "function" === typeof AggregateError ? new AggregateError(errors2) : errors2[0];
        }
        function popActScope(prevActQueue, prevActScopeDepth) {
          prevActScopeDepth !== actScopeDepth - 1 && console.error(
            "You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. "
          );
          actScopeDepth = prevActScopeDepth;
        }
        function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
          var queue = ReactSharedInternals.actQueue;
          if (null !== queue)
            if (0 !== queue.length)
              try {
                flushActQueue(queue);
                enqueueTask(function() {
                  return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                });
                return;
              } catch (error) {
                ReactSharedInternals.thrownErrors.push(error);
              }
            else ReactSharedInternals.actQueue = null;
          0 < ReactSharedInternals.thrownErrors.length ? (queue = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(queue)) : resolve(returnValue);
        }
        function flushActQueue(queue) {
          if (!isFlushing) {
            isFlushing = true;
            var i = 0;
            try {
              for (; i < queue.length; i++) {
                var callback = queue[i];
                do {
                  ReactSharedInternals.didUsePromise = false;
                  var continuation = callback(false);
                  if (null !== continuation) {
                    if (ReactSharedInternals.didUsePromise) {
                      queue[i] = callback;
                      queue.splice(0, i);
                      return;
                    }
                    callback = continuation;
                  } else break;
                } while (1);
              }
              queue.length = 0;
            } catch (error) {
              queue.splice(0, i + 1), ReactSharedInternals.thrownErrors.push(error);
            } finally {
              isFlushing = false;
            }
          }
        }
        "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
        var REACT_ELEMENT_TYPE = /* @__PURE__ */ Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = /* @__PURE__ */ Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = /* @__PURE__ */ Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = /* @__PURE__ */ Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = /* @__PURE__ */ Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = /* @__PURE__ */ Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = /* @__PURE__ */ Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = /* @__PURE__ */ Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = /* @__PURE__ */ Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = /* @__PURE__ */ Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = /* @__PURE__ */ Symbol.for("react.memo"), REACT_LAZY_TYPE = /* @__PURE__ */ Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = /* @__PURE__ */ Symbol.for("react.activity"), REACT_VIEW_TRANSITION_TYPE = /* @__PURE__ */ Symbol.for("react.view_transition"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator, didWarnStateUpdateForUnmountedComponent = {}, ReactNoopUpdateQueue = {
          isMounted: function() {
            return false;
          },
          enqueueForceUpdate: function(publicInstance) {
            warnNoop(publicInstance, "forceUpdate");
          },
          enqueueReplaceState: function(publicInstance) {
            warnNoop(publicInstance, "replaceState");
          },
          enqueueSetState: function(publicInstance) {
            warnNoop(publicInstance, "setState");
          }
        }, assign = Object.assign, emptyObject = {};
        Object.freeze(emptyObject);
        Component.prototype.isReactComponent = {};
        Component.prototype.setState = function(partialState, callback) {
          if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
            throw Error(
              "takes an object of state variables to update or a function which returns an object of state variables."
            );
          this.updater.enqueueSetState(this, partialState, callback, "setState");
        };
        Component.prototype.forceUpdate = function(callback) {
          this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
        };
        var deprecatedAPIs = {
          isMounted: [
            "isMounted",
            "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."
          ],
          replaceState: [
            "replaceState",
            "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."
          ]
        };
        for (fnName in deprecatedAPIs)
          deprecatedAPIs.hasOwnProperty(fnName) && defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
        ComponentDummy.prototype = Component.prototype;
        deprecatedAPIs = PureComponent.prototype = new ComponentDummy();
        deprecatedAPIs.constructor = PureComponent;
        assign(deprecatedAPIs, Component.prototype);
        deprecatedAPIs.isPureReactComponent = true;
        var isArrayImpl = Array.isArray, REACT_CLIENT_REFERENCE = /* @__PURE__ */ Symbol.for("react.client.reference"), ReactSharedInternals = {
          H: null,
          A: null,
          T: null,
          S: null,
          actQueue: null,
          asyncTransitions: 0,
          isBatchingLegacy: false,
          didScheduleLegacyUpdate: false,
          didUsePromise: false,
          thrownErrors: [],
          getCurrentStack: null,
          recentlyCreatedOwnerStacks: 0
        }, hasOwnProperty = Object.prototype.hasOwnProperty, createTask = console.createTask ? console.createTask : function() {
          return null;
        };
        deprecatedAPIs = {
          react_stack_bottom_frame: function(callStackForError) {
            return callStackForError();
          }
        };
        var specialPropKeyWarningShown, didWarnAboutOldJSXRuntime;
        var didWarnAboutElementRef = {};
        var unknownOwnerDebugStack = deprecatedAPIs.react_stack_bottom_frame.bind(
          deprecatedAPIs,
          UnknownOwner
        )();
        var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
        var didWarnAboutMaps = false, userProvidedKeyEscapeRegex = /\/+/g, reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
          if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
            var event = new window.ErrorEvent("error", {
              bubbles: true,
              cancelable: true,
              message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
              error
            });
            if (!window.dispatchEvent(event)) return;
          } else if ("object" === typeof process && "function" === typeof process.emit) {
            process.emit("uncaughtException", error);
            return;
          }
          console.error(error);
        }, didWarnAboutMessageChannel = false, enqueueTaskImpl = null, actScopeDepth = 0, didWarnNoAwaitAct = false, isFlushing = false, queueSeveralMicrotasks = "function" === typeof queueMicrotask ? function(callback) {
          queueMicrotask(function() {
            return queueMicrotask(callback);
          });
        } : enqueueTask;
        deprecatedAPIs = Object.freeze({
          __proto__: null,
          c: function(size) {
            return resolveDispatcher().useMemoCache(size);
          }
        });
        var fnName = {
          map: mapChildren,
          forEach: function(children, forEachFunc, forEachContext) {
            mapChildren(
              children,
              function() {
                forEachFunc.apply(this, arguments);
              },
              forEachContext
            );
          },
          count: function(children) {
            var n = 0;
            mapChildren(children, function() {
              n++;
            });
            return n;
          },
          toArray: function(children) {
            return mapChildren(children, function(child) {
              return child;
            }) || [];
          },
          only: function(children) {
            if (!isValidElement2(children))
              throw Error(
                "React.Children.only expected to receive a single React element child."
              );
            return children;
          }
        };
        exports.Activity = REACT_ACTIVITY_TYPE;
        exports.Children = fnName;
        exports.Component = Component;
        exports.Fragment = REACT_FRAGMENT_TYPE;
        exports.Profiler = REACT_PROFILER_TYPE;
        exports.PureComponent = PureComponent;
        exports.StrictMode = REACT_STRICT_MODE_TYPE;
        exports.Suspense = REACT_SUSPENSE_TYPE;
        exports.ViewTransition = REACT_VIEW_TRANSITION_TYPE;
        exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
        exports.__COMPILER_RUNTIME = deprecatedAPIs;
        exports.act = function(callback) {
          var prevActQueue = ReactSharedInternals.actQueue, prevActScopeDepth = actScopeDepth;
          actScopeDepth++;
          var queue = ReactSharedInternals.actQueue = null !== prevActQueue ? prevActQueue : [], didAwaitActCall = false;
          try {
            var result = callback();
          } catch (error) {
            ReactSharedInternals.thrownErrors.push(error);
          }
          if (0 < ReactSharedInternals.thrownErrors.length)
            throw popActScope(prevActQueue, prevActScopeDepth), callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
          if (null !== result && "object" === typeof result && "function" === typeof result.then) {
            var thenable = result;
            queueSeveralMicrotasks(function() {
              didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
                "You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);"
              ));
            });
            return {
              then: function(resolve, reject) {
                didAwaitActCall = true;
                thenable.then(
                  function(returnValue) {
                    popActScope(prevActQueue, prevActScopeDepth);
                    if (0 === prevActScopeDepth) {
                      try {
                        flushActQueue(queue), enqueueTask(function() {
                          return recursivelyFlushAsyncActWork(
                            returnValue,
                            resolve,
                            reject
                          );
                        });
                      } catch (error$0) {
                        ReactSharedInternals.thrownErrors.push(error$0);
                      }
                      if (0 < ReactSharedInternals.thrownErrors.length) {
                        var _thrownError = aggregateErrors(
                          ReactSharedInternals.thrownErrors
                        );
                        ReactSharedInternals.thrownErrors.length = 0;
                        reject(_thrownError);
                      }
                    } else resolve(returnValue);
                  },
                  function(error) {
                    popActScope(prevActQueue, prevActScopeDepth);
                    0 < ReactSharedInternals.thrownErrors.length ? (error = aggregateErrors(
                      ReactSharedInternals.thrownErrors
                    ), ReactSharedInternals.thrownErrors.length = 0, reject(error)) : reject(error);
                  }
                );
              }
            };
          }
          var returnValue$jscomp$0 = result;
          popActScope(prevActQueue, prevActScopeDepth);
          0 === prevActScopeDepth && (flushActQueue(queue), 0 !== queue.length && queueSeveralMicrotasks(function() {
            didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
              "A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)"
            ));
          }), ReactSharedInternals.actQueue = null);
          if (0 < ReactSharedInternals.thrownErrors.length)
            throw callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
          return {
            then: function(resolve, reject) {
              didAwaitActCall = true;
              0 === prevActScopeDepth ? (ReactSharedInternals.actQueue = queue, enqueueTask(function() {
                return recursivelyFlushAsyncActWork(
                  returnValue$jscomp$0,
                  resolve,
                  reject
                );
              })) : resolve(returnValue$jscomp$0);
            }
          };
        };
        exports.addTransitionType = addTransitionType;
        exports.cache = function(fn) {
          return function() {
            return fn.apply(null, arguments);
          };
        };
        exports.cacheSignal = function() {
          return null;
        };
        exports.captureOwnerStack = function() {
          var getCurrentStack = ReactSharedInternals.getCurrentStack;
          return null === getCurrentStack ? null : getCurrentStack();
        };
        exports.cloneElement = function(element, config, children) {
          if (null === element || void 0 === element)
            throw Error(
              "The argument must be a React element, but you passed " + element + "."
            );
          var props = assign({}, element.props), key = element.key, owner = element._owner;
          if (null != config) {
            var JSCompiler_inline_result;
            a: {
              if (hasOwnProperty.call(config, "ref") && (JSCompiler_inline_result = Object.getOwnPropertyDescriptor(
                config,
                "ref"
              ).get) && JSCompiler_inline_result.isReactWarning) {
                JSCompiler_inline_result = false;
                break a;
              }
              JSCompiler_inline_result = void 0 !== config.ref;
            }
            JSCompiler_inline_result && (owner = getOwner());
            hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key);
            for (propName in config)
              !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
          }
          var propName = arguments.length - 2;
          if (1 === propName) props.children = children;
          else if (1 < propName) {
            JSCompiler_inline_result = Array(propName);
            for (var i = 0; i < propName; i++)
              JSCompiler_inline_result[i] = arguments[i + 2];
            props.children = JSCompiler_inline_result;
          }
          props = ReactElement(
            element.type,
            key,
            props,
            owner,
            element._debugStack,
            element._debugTask
          );
          for (key = 2; key < arguments.length; key++)
            validateChildKeys(arguments[key]);
          return props;
        };
        exports.createContext = function(defaultValue) {
          defaultValue = {
            $$typeof: REACT_CONTEXT_TYPE,
            _currentValue: defaultValue,
            _currentValue2: defaultValue,
            _threadCount: 0,
            Provider: null,
            Consumer: null
          };
          defaultValue.Provider = defaultValue;
          defaultValue.Consumer = {
            $$typeof: REACT_CONSUMER_TYPE,
            _context: defaultValue
          };
          defaultValue._currentRenderer = null;
          defaultValue._currentRenderer2 = null;
          return defaultValue;
        };
        exports.createElement = function(type, config, children) {
          for (var i = 2; i < arguments.length; i++)
            validateChildKeys(arguments[i]);
          var propName;
          i = {};
          var key = null;
          if (null != config)
            for (propName in didWarnAboutOldJSXRuntime || !("__self" in config) || "key" in config || (didWarnAboutOldJSXRuntime = true, console.warn(
              "Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform"
            )), hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key), config)
              hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (i[propName] = config[propName]);
          var childrenLength = arguments.length - 2;
          if (1 === childrenLength) i.children = children;
          else if (1 < childrenLength) {
            for (var childArray = Array(childrenLength), _i = 0; _i < childrenLength; _i++)
              childArray[_i] = arguments[_i + 2];
            Object.freeze && Object.freeze(childArray);
            i.children = childArray;
          }
          if (type && type.defaultProps)
            for (propName in childrenLength = type.defaultProps, childrenLength)
              void 0 === i[propName] && (i[propName] = childrenLength[propName]);
          key && defineKeyPropWarningGetter(
            i,
            "function" === typeof type ? type.displayName || type.name || "Unknown" : type
          );
          (propName = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++) ? (childArray = Error.stackTraceLimit, Error.stackTraceLimit = 10, childrenLength = Error("react-stack-top-frame"), Error.stackTraceLimit = childArray) : childrenLength = unknownOwnerDebugStack;
          return ReactElement(
            type,
            key,
            i,
            getOwner(),
            childrenLength,
            propName ? createTask(getTaskName(type)) : unknownOwnerDebugTask
          );
        };
        exports.createRef = function() {
          var refObject = { current: null };
          Object.seal(refObject);
          return refObject;
        };
        exports.forwardRef = function(render) {
          null != render && render.$$typeof === REACT_MEMO_TYPE ? console.error(
            "forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...))."
          ) : "function" !== typeof render ? console.error(
            "forwardRef requires a render function but was given %s.",
            null === render ? "null" : typeof render
          ) : 0 !== render.length && 2 !== render.length && console.error(
            "forwardRef render functions accept exactly two parameters: props and ref. %s",
            1 === render.length ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined."
          );
          null != render && null != render.defaultProps && console.error(
            "forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?"
          );
          var elementType = { $$typeof: REACT_FORWARD_REF_TYPE, render }, ownName;
          Object.defineProperty(elementType, "displayName", {
            enumerable: false,
            configurable: true,
            get: function() {
              return ownName;
            },
            set: function(name) {
              ownName = name;
              render.name || render.displayName || (Object.defineProperty(render, "name", { value: name }), render.displayName = name);
            }
          });
          return elementType;
        };
        exports.isValidElement = isValidElement2;
        exports.lazy = function(ctor) {
          ctor = { _status: -1, _result: ctor };
          var lazyType = {
            $$typeof: REACT_LAZY_TYPE,
            _payload: ctor,
            _init: lazyInitializer
          }, ioInfo = {
            name: "lazy",
            start: -1,
            end: -1,
            value: null,
            owner: null,
            debugStack: Error("react-stack-top-frame"),
            debugTask: console.createTask ? console.createTask("lazy()") : null
          };
          ctor._ioInfo = ioInfo;
          lazyType._debugInfo = [{ awaited: ioInfo }];
          return lazyType;
        };
        exports.memo = function(type, compare2) {
          null == type && console.error(
            "memo: The first argument must be a component. Instead received: %s",
            null === type ? "null" : typeof type
          );
          compare2 = {
            $$typeof: REACT_MEMO_TYPE,
            type,
            compare: void 0 === compare2 ? null : compare2
          };
          var ownName;
          Object.defineProperty(compare2, "displayName", {
            enumerable: false,
            configurable: true,
            get: function() {
              return ownName;
            },
            set: function(name) {
              ownName = name;
              type.name || type.displayName || (Object.defineProperty(type, "name", { value: name }), type.displayName = name);
            }
          });
          return compare2;
        };
        exports.startTransition = startTransition;
        exports.unstable_useCacheRefresh = function() {
          return resolveDispatcher().useCacheRefresh();
        };
        exports.use = function(usable) {
          return resolveDispatcher().use(usable);
        };
        exports.useActionState = function(action, initialState, permalink) {
          return resolveDispatcher().useActionState(
            action,
            initialState,
            permalink
          );
        };
        exports.useCallback = function(callback, deps) {
          return resolveDispatcher().useCallback(callback, deps);
        };
        exports.useContext = function(Context) {
          var dispatcher = resolveDispatcher();
          Context.$$typeof === REACT_CONSUMER_TYPE && console.error(
            "Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?"
          );
          return dispatcher.useContext(Context);
        };
        exports.useDebugValue = function(value, formatterFn) {
          return resolveDispatcher().useDebugValue(value, formatterFn);
        };
        exports.useDeferredValue = function(value, initialValue) {
          return resolveDispatcher().useDeferredValue(value, initialValue);
        };
        exports.useEffect = function(create, deps) {
          null == create && console.warn(
            "React Hook useEffect requires an effect callback. Did you forget to pass a callback to the hook?"
          );
          return resolveDispatcher().useEffect(create, deps);
        };
        exports.useEffectEvent = function(callback) {
          return resolveDispatcher().useEffectEvent(callback);
        };
        exports.useId = function() {
          return resolveDispatcher().useId();
        };
        exports.useImperativeHandle = function(ref, create, deps) {
          return resolveDispatcher().useImperativeHandle(ref, create, deps);
        };
        exports.useInsertionEffect = function(create, deps) {
          null == create && console.warn(
            "React Hook useInsertionEffect requires an effect callback. Did you forget to pass a callback to the hook?"
          );
          return resolveDispatcher().useInsertionEffect(create, deps);
        };
        exports.useLayoutEffect = function(create, deps) {
          null == create && console.warn(
            "React Hook useLayoutEffect requires an effect callback. Did you forget to pass a callback to the hook?"
          );
          return resolveDispatcher().useLayoutEffect(create, deps);
        };
        exports.useMemo = function(create, deps) {
          return resolveDispatcher().useMemo(create, deps);
        };
        exports.useOptimistic = function(passthrough, reducer) {
          return resolveDispatcher().useOptimistic(passthrough, reducer);
        };
        exports.useReducer = function(reducer, initialArg, init2) {
          return resolveDispatcher().useReducer(reducer, initialArg, init2);
        };
        exports.useRef = function(initialValue) {
          return resolveDispatcher().useRef(initialValue);
        };
        exports.useState = function(initialState) {
          return resolveDispatcher().useState(initialState);
        };
        exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
          return resolveDispatcher().useSyncExternalStore(
            subscribe,
            getSnapshot,
            getServerSnapshot
          );
        };
        exports.useTransition = function() {
          return resolveDispatcher().useTransition();
        };
        exports.version = "19.3.0";
        "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
      })();
    }
  });

  // node_modules/.pnpm/react@19.3.0/node_modules/react/index.js
  var require_react = __commonJS({
    "node_modules/.pnpm/react@19.3.0/node_modules/react/index.js"(exports, module) {
      "use strict";
      if (false) {
        module.exports = null;
      } else {
        module.exports = require_react_development();
      }
    }
  });

  // node_modules/.pnpm/use-sync-external-store@1.7.0_react@19.3.0/node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.development.js
  var require_use_sync_external_store_shim_development = __commonJS({
    "node_modules/.pnpm/use-sync-external-store@1.7.0_react@19.3.0/node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.development.js"(exports) {
      "use strict";
      (function() {
        function is(x, y) {
          return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
        }
        function useSyncExternalStore$2(subscribe, getSnapshot) {
          didWarnOld18Alpha || void 0 === React3.startTransition || (didWarnOld18Alpha = true, console.error(
            "You are using an outdated, pre-release alpha of React 18 that does not support useSyncExternalStore. The use-sync-external-store shim will not work correctly. Upgrade to a newer pre-release."
          ));
          var value = getSnapshot();
          if (!didWarnUncachedGetSnapshot) {
            var cachedValue = getSnapshot();
            objectIs(value, cachedValue) || (console.error(
              "The result of getSnapshot should be cached to avoid an infinite loop"
            ), didWarnUncachedGetSnapshot = true);
          }
          cachedValue = useState2({
            inst: { value, getSnapshot }
          });
          var inst = cachedValue[0].inst, forceUpdate = cachedValue[1];
          useLayoutEffect(
            function() {
              inst.value = value;
              inst.getSnapshot = getSnapshot;
              checkIfSnapshotChanged(inst) && forceUpdate({ inst });
            },
            [subscribe, value, getSnapshot]
          );
          useEffect2(
            function() {
              checkIfSnapshotChanged(inst) && forceUpdate({ inst });
              return subscribe(function() {
                checkIfSnapshotChanged(inst) && forceUpdate({ inst });
              });
            },
            [subscribe]
          );
          useDebugValue(value);
          return value;
        }
        function checkIfSnapshotChanged(inst) {
          var latestGetSnapshot = inst.getSnapshot;
          inst = inst.value;
          try {
            var nextValue = latestGetSnapshot();
            return !objectIs(inst, nextValue);
          } catch (error) {
            return true;
          }
        }
        function useSyncExternalStore$1(subscribe, getSnapshot) {
          return getSnapshot();
        }
        "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
        var React3 = require_react(), objectIs = "function" === typeof Object.is ? Object.is : is, useState2 = React3.useState, useEffect2 = React3.useEffect, useLayoutEffect = React3.useLayoutEffect, useDebugValue = React3.useDebugValue, didWarnOld18Alpha = false, didWarnUncachedGetSnapshot = false, shim = "undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement ? useSyncExternalStore$1 : useSyncExternalStore$2;
        exports.useSyncExternalStore = void 0 !== React3.useSyncExternalStore ? React3.useSyncExternalStore : shim;
        "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
      })();
    }
  });

  // node_modules/.pnpm/use-sync-external-store@1.7.0_react@19.3.0/node_modules/use-sync-external-store/shim/index.js
  var require_shim = __commonJS({
    "node_modules/.pnpm/use-sync-external-store@1.7.0_react@19.3.0/node_modules/use-sync-external-store/shim/index.js"(exports, module) {
      "use strict";
      if (false) {
        module.exports = null;
      } else {
        module.exports = require_use_sync_external_store_shim_development();
      }
    }
  });

  // node_modules/.pnpm/i18next@26.4.2_typescript@7.0.2/node_modules/i18next/dist/esm/i18next.js
  var isString = (obj) => typeof obj === "string";
  var defer = () => {
    let res;
    let rej;
    const promise = new Promise((resolve, reject) => {
      res = resolve;
      rej = reject;
    });
    promise.resolve = res;
    promise.reject = rej;
    return promise;
  };
  var makeString = (object) => {
    if (object == null) return "";
    return String(object);
  };
  var copy = (a, s, t2) => {
    a.forEach((m) => {
      if (s[m]) t2[m] = s[m];
    });
  };
  var lastOfPathSeparatorRegExp = /###/g;
  var cleanKey = (key) => key && key.includes("###") ? key.replace(lastOfPathSeparatorRegExp, ".") : key;
  var canNotTraverseDeeper = (object) => !object || isString(object);
  var getLastOfPath = (object, path, Empty) => {
    const stack = !isString(path) ? path : path.split(".");
    let stackIndex = 0;
    while (stackIndex < stack.length - 1) {
      if (canNotTraverseDeeper(object)) return {};
      const key = cleanKey(stack[stackIndex]);
      if (!object[key] && Empty) object[key] = new Empty();
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        object = object[key];
      } else {
        object = {};
      }
      ++stackIndex;
    }
    if (canNotTraverseDeeper(object)) return {};
    return {
      obj: object,
      k: cleanKey(stack[stackIndex])
    };
  };
  var setPath = (object, path, newValue) => {
    const {
      obj,
      k
    } = getLastOfPath(object, path, Object);
    if (obj !== void 0 || path.length === 1) {
      obj[k] = newValue;
      return;
    }
    let e = path[path.length - 1];
    let p = path.slice(0, path.length - 1);
    let last = getLastOfPath(object, p, Object);
    while (last.obj === void 0 && p.length) {
      e = `${p[p.length - 1]}.${e}`;
      p = p.slice(0, p.length - 1);
      last = getLastOfPath(object, p, Object);
      if (last?.obj && typeof last.obj[`${last.k}.${e}`] !== "undefined") {
        last.obj = void 0;
      }
    }
    last.obj[`${last.k}.${e}`] = newValue;
  };
  var pushPath = (object, path, newValue, concat) => {
    const {
      obj,
      k
    } = getLastOfPath(object, path, Object);
    obj[k] = obj[k] || [];
    obj[k].push(newValue);
  };
  var getPath = (object, path) => {
    const {
      obj,
      k
    } = getLastOfPath(object, path);
    if (!obj) return void 0;
    if (!Object.prototype.hasOwnProperty.call(obj, k)) return void 0;
    return obj[k];
  };
  var getPathWithDefaults = (data, defaultData, key) => {
    const value = getPath(data, key);
    if (value !== void 0) {
      return value;
    }
    return getPath(defaultData, key);
  };
  var deepExtend = (target, source, overwrite) => {
    for (const prop in source) {
      if (prop !== "__proto__" && prop !== "constructor") {
        if (Object.prototype.hasOwnProperty.call(target, prop)) {
          if (isString(target[prop]) || target[prop] instanceof String || isString(source[prop]) || source[prop] instanceof String) {
            if (overwrite) target[prop] = source[prop];
          } else {
            deepExtend(target[prop], source[prop], overwrite);
          }
        } else {
          target[prop] = source[prop];
        }
      }
    }
    return target;
  };
  var regexEscape = (str) => str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  var _entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;"
  };
  var escape = (data) => {
    if (isString(data)) {
      return data.replace(/[&<>"'\/]/g, (s) => _entityMap[s]);
    }
    return data;
  };
  var RegExpCache = class {
    constructor(capacity) {
      this.capacity = capacity;
      this.regExpMap = /* @__PURE__ */ new Map();
      this.regExpQueue = [];
    }
    getRegExp(pattern) {
      const regExpFromCache = this.regExpMap.get(pattern);
      if (regExpFromCache !== void 0) {
        return regExpFromCache;
      }
      const regExpNew = new RegExp(pattern);
      if (this.regExpQueue.length === this.capacity) {
        this.regExpMap.delete(this.regExpQueue.shift());
      }
      this.regExpMap.set(pattern, regExpNew);
      this.regExpQueue.push(pattern);
      return regExpNew;
    }
  };
  var chars = [" ", ",", "?", "!", ";"];
  var looksLikeObjectPathRegExpCache = new RegExpCache(20);
  var looksLikeObjectPath = (key, nsSeparator, keySeparator) => {
    nsSeparator = nsSeparator || "";
    keySeparator = keySeparator || "";
    const possibleChars = chars.filter((c) => !nsSeparator.includes(c) && !keySeparator.includes(c));
    if (possibleChars.length === 0) return true;
    const r = looksLikeObjectPathRegExpCache.getRegExp(`(${possibleChars.map((c) => c === "?" ? "\\?" : c).join("|")})`);
    let matched = !r.test(key);
    if (!matched) {
      const ki = key.indexOf(keySeparator);
      if (ki > 0 && !r.test(key.substring(0, ki))) {
        matched = true;
      }
    }
    return matched;
  };
  var deepFind = (obj, path, keySeparator = ".") => {
    if (!obj) return void 0;
    if (obj[path]) {
      if (!Object.prototype.hasOwnProperty.call(obj, path)) return void 0;
      return obj[path];
    }
    const tokens = path.split(keySeparator);
    let current = obj;
    for (let i = 0; i < tokens.length; ) {
      if (!current || typeof current !== "object") {
        return void 0;
      }
      let next;
      let nextPath = "";
      for (let j = i; j < tokens.length; ++j) {
        if (j !== i) {
          nextPath += keySeparator;
        }
        nextPath += tokens[j];
        next = current[nextPath];
        if (next !== void 0) {
          if (["string", "number", "boolean"].includes(typeof next) && j < tokens.length - 1) {
            continue;
          }
          i += j - i + 1;
          break;
        }
      }
      current = next;
    }
    return current;
  };
  var getCleanedCode = (code) => code?.replace(/_/g, "-");
  var consoleLogger = {
    type: "logger",
    log(args) {
      this.output("log", args);
    },
    warn(args) {
      this.output("warn", args);
    },
    error(args) {
      this.output("error", args);
    },
    output(type, args) {
      console?.[type]?.apply?.(console, args);
    }
  };
  var Logger = class _Logger {
    constructor(concreteLogger, options = {}) {
      this.init(concreteLogger, options);
    }
    init(concreteLogger, options = {}) {
      this.prefix = options.prefix || "i18next:";
      this.logger = concreteLogger || consoleLogger;
      this.options = options;
      this.debug = options.debug;
    }
    log(...args) {
      return this.forward(args, "log", "", true);
    }
    warn(...args) {
      return this.forward(args, "warn", "", true);
    }
    error(...args) {
      return this.forward(args, "error", "");
    }
    deprecate(...args) {
      return this.forward(args, "warn", "WARNING DEPRECATED: ", true);
    }
    forward(args, lvl, prefix, debugOnly) {
      if (debugOnly && !this.debug) return null;
      args = args.map((a) => isString(a) ? a.replace(/[\r\n\x00-\x1F\x7F]/g, " ") : a);
      if (isString(args[0])) args[0] = `${prefix}${this.prefix} ${args[0]}`;
      return this.logger[lvl](args);
    }
    create(moduleName) {
      return new _Logger(this.logger, {
        ...{
          prefix: `${this.prefix}:${moduleName}:`
        },
        ...this.options
      });
    }
    clone(options) {
      options = options || this.options;
      options.prefix = options.prefix || this.prefix;
      return new _Logger(this.logger, options);
    }
  };
  var baseLogger = new Logger();
  var EventEmitter = class {
    constructor() {
      this.observers = {};
    }
    on(events, listener) {
      events.split(" ").forEach((event) => {
        if (!this.observers[event]) this.observers[event] = /* @__PURE__ */ new Map();
        const numListeners = this.observers[event].get(listener) || 0;
        this.observers[event].set(listener, numListeners + 1);
      });
      return this;
    }
    off(event, listener) {
      if (!this.observers[event]) return;
      if (!listener) {
        delete this.observers[event];
        return;
      }
      this.observers[event].delete(listener);
    }
    once(event, listener) {
      const wrapper = (...args) => {
        listener(...args);
        this.off(event, wrapper);
      };
      this.on(event, wrapper);
      return this;
    }
    emit(event, ...args) {
      if (this.observers[event]) {
        const cloned = Array.from(this.observers[event].entries());
        cloned.forEach(([observer, numTimesAdded]) => {
          for (let i = 0; i < numTimesAdded; i++) {
            observer(...args);
          }
        });
      }
      if (this.observers["*"]) {
        const cloned = Array.from(this.observers["*"].entries());
        cloned.forEach(([observer, numTimesAdded]) => {
          for (let i = 0; i < numTimesAdded; i++) {
            observer(event, ...args);
          }
        });
      }
    }
  };
  var ResourceStore = class extends EventEmitter {
    constructor(data, options = {
      ns: ["translation"],
      defaultNS: "translation"
    }) {
      super();
      this.data = data || {};
      this.options = options;
      if (this.options.keySeparator === void 0) {
        this.options.keySeparator = ".";
      }
      if (this.options.ignoreJSONStructure === void 0) {
        this.options.ignoreJSONStructure = true;
      }
    }
    addNamespaces(ns) {
      if (!this.options.ns.includes(ns)) {
        this.options.ns.push(ns);
      }
    }
    removeNamespaces(ns) {
      const index2 = this.options.ns.indexOf(ns);
      if (index2 > -1) {
        this.options.ns.splice(index2, 1);
      }
    }
    getResource(lng, ns, key, options = {}) {
      const keySeparator = options.keySeparator !== void 0 ? options.keySeparator : this.options.keySeparator;
      const ignoreJSONStructure = options.ignoreJSONStructure !== void 0 ? options.ignoreJSONStructure : this.options.ignoreJSONStructure;
      let path;
      if (lng.includes(".")) {
        path = lng.split(".");
      } else {
        path = [lng, ns];
        if (key) {
          if (Array.isArray(key)) {
            path.push(...key);
          } else if (isString(key) && keySeparator) {
            path.push(...key.split(keySeparator));
          } else {
            path.push(key);
          }
        }
      }
      const result = getPath(this.data, path);
      if (!result && !ns && !key && lng.includes(".")) {
        lng = path[0];
        ns = path[1];
        key = path.slice(2).join(".");
      }
      if (result || !ignoreJSONStructure || !isString(key)) return result;
      return deepFind(this.data?.[lng]?.[ns], key, keySeparator);
    }
    addResource(lng, ns, key, value, options = {
      silent: false
    }) {
      const keySeparator = options.keySeparator !== void 0 ? options.keySeparator : this.options.keySeparator;
      let path = [lng, ns];
      if (key) path = path.concat(keySeparator ? key.split(keySeparator) : key);
      if (lng.includes(".")) {
        path = lng.split(".");
        value = ns;
        ns = path[1];
      }
      this.addNamespaces(ns);
      setPath(this.data, path, value);
      if (!options.silent) this.emit("added", lng, ns, key, value);
    }
    addResources(lng, ns, resources, options = {
      silent: false
    }) {
      for (const m in resources) {
        if (isString(resources[m]) || Array.isArray(resources[m])) this.addResource(lng, ns, m, resources[m], {
          silent: true
        });
      }
      if (!options.silent) this.emit("added", lng, ns, resources);
    }
    addResourceBundle(lng, ns, resources, deep, overwrite, options = {
      silent: false,
      skipCopy: false
    }) {
      let path = [lng, ns];
      if (lng.includes(".")) {
        path = lng.split(".");
        deep = resources;
        resources = ns;
        ns = path[1];
      }
      this.addNamespaces(ns);
      let pack = getPath(this.data, path) || {};
      if (!options.skipCopy) resources = JSON.parse(JSON.stringify(resources));
      if (deep) {
        deepExtend(pack, resources, overwrite);
      } else {
        pack = {
          ...pack,
          ...resources
        };
      }
      setPath(this.data, path, pack);
      if (!options.silent) this.emit("added", lng, ns, resources);
    }
    removeResourceBundle(lng, ns) {
      if (this.hasResourceBundle(lng, ns)) {
        delete this.data[lng][ns];
      }
      this.removeNamespaces(ns);
      this.emit("removed", lng, ns);
    }
    hasResourceBundle(lng, ns) {
      return this.getResource(lng, ns) !== void 0;
    }
    getResourceBundle(lng, ns) {
      if (!ns) ns = this.options.defaultNS;
      return this.getResource(lng, ns);
    }
    getDataByLanguage(lng) {
      return this.data[lng];
    }
    hasLanguageSomeTranslations(lng) {
      const data = this.getDataByLanguage(lng);
      const n = data && Object.keys(data) || [];
      return !!n.find((v) => data[v] && Object.keys(data[v]).length > 0);
    }
    toJSON() {
      return this.data;
    }
  };
  var postProcessor = {
    processors: {},
    addPostProcessor(module) {
      this.processors[module.name] = module;
    },
    handle(processors, value, key, options, translator) {
      processors.forEach((processor) => {
        value = this.processors[processor]?.process(value, key, options, translator) ?? value;
      });
      return value;
    }
  };
  var PATH_KEY = /* @__PURE__ */ Symbol("i18next/PATH_KEY");
  function createProxy() {
    const state = [];
    const handler = /* @__PURE__ */ Object.create(null);
    let proxy;
    handler.get = (target, key) => {
      proxy?.revoke?.();
      if (key === PATH_KEY) return state;
      state.push(key);
      proxy = Proxy.revocable(target, handler);
      return proxy.proxy;
    };
    return Proxy.revocable(/* @__PURE__ */ Object.create(null), handler).proxy;
  }
  function keysFromSelector(selector, opts) {
    const {
      [PATH_KEY]: path
    } = selector(createProxy());
    const keySeparator = opts?.keySeparator ?? ".";
    const nsSeparator = opts?.nsSeparator ?? ":";
    const strict = opts?.enableSelector === "strict";
    if (path.length > 1 && nsSeparator) {
      const ns = opts?.ns;
      const nsList = strict ? Array.isArray(ns) ? ns : ns ? [ns] : null : Array.isArray(ns) ? ns : null;
      if (nsList) {
        const candidates = strict ? nsList : nsList.length > 1 ? nsList.slice(1) : [];
        if (candidates.includes(path[0])) {
          return `${path[0]}${nsSeparator}${path.slice(1).join(keySeparator)}`;
        }
      }
    }
    return path.join(keySeparator);
  }
  var shouldHandleAsObject = (res) => !isString(res) && typeof res !== "boolean" && typeof res !== "number";
  var Translator = class _Translator extends EventEmitter {
    constructor(services, options = {}) {
      super();
      copy(["resourceStore", "languageUtils", "pluralResolver", "interpolator", "backendConnector", "i18nFormat", "utils"], services, this);
      this.options = options;
      if (this.options.keySeparator === void 0) {
        this.options.keySeparator = ".";
      }
      this.logger = baseLogger.create("translator");
      this.checkedLoadedFor = {};
    }
    changeLanguage(lng) {
      if (lng) this.language = lng;
    }
    exists(key, o = {
      interpolation: {}
    }) {
      const opt = {
        ...o
      };
      if (key == null) return false;
      const resolved = this.resolve(key, opt);
      if (resolved?.res === void 0) return false;
      const isObject2 = shouldHandleAsObject(resolved.res);
      if (opt.returnObjects === false && isObject2) {
        return false;
      }
      return true;
    }
    extractFromKey(key, opt) {
      let nsSeparator = opt.nsSeparator !== void 0 ? opt.nsSeparator : this.options.nsSeparator;
      if (nsSeparator === void 0) nsSeparator = ":";
      const keySeparator = opt.keySeparator !== void 0 ? opt.keySeparator : this.options.keySeparator;
      let namespaces = opt.ns || this.options.defaultNS || [];
      const wouldCheckForNsInKey = nsSeparator && key.includes(nsSeparator);
      const seemsNaturalLanguage = !this.options.userDefinedKeySeparator && !opt.keySeparator && !this.options.userDefinedNsSeparator && !opt.nsSeparator && !looksLikeObjectPath(key, nsSeparator, keySeparator);
      if (wouldCheckForNsInKey && !seemsNaturalLanguage) {
        const m = key.match(this.interpolator.nestingRegexp);
        if (m && m.length > 0) {
          return {
            key,
            namespaces: isString(namespaces) ? [namespaces] : namespaces
          };
        }
        const parts = key.split(nsSeparator);
        if (nsSeparator !== keySeparator || nsSeparator === keySeparator && this.options.ns.includes(parts[0])) namespaces = parts.shift();
        key = parts.join(keySeparator);
      }
      return {
        key,
        namespaces: isString(namespaces) ? [namespaces] : namespaces
      };
    }
    translate(keys, o, lastKey) {
      let opt = typeof o === "object" ? {
        ...o
      } : o;
      if (typeof opt !== "object" && this.options.overloadTranslationOptionHandler) {
        opt = this.options.overloadTranslationOptionHandler(arguments);
      }
      if (typeof opt === "object") opt = {
        ...opt
      };
      if (!opt) opt = {};
      if (keys == null) return "";
      if (typeof keys === "function") keys = keysFromSelector(keys, {
        ...this.options,
        ...opt
      });
      if (!Array.isArray(keys)) keys = [String(keys)];
      keys = keys.map((k) => typeof k === "function" ? keysFromSelector(k, {
        ...this.options,
        ...opt
      }) : String(k));
      const returnDetails = opt.returnDetails !== void 0 ? opt.returnDetails : this.options.returnDetails;
      const keySeparator = opt.keySeparator !== void 0 ? opt.keySeparator : this.options.keySeparator;
      const {
        key,
        namespaces
      } = this.extractFromKey(keys[keys.length - 1], opt);
      const namespace = namespaces[namespaces.length - 1];
      let nsSeparator = opt.nsSeparator !== void 0 ? opt.nsSeparator : this.options.nsSeparator;
      if (nsSeparator === void 0) nsSeparator = ":";
      const lng = opt.lng || this.language;
      const appendNamespaceToCIMode = opt.appendNamespaceToCIMode || this.options.appendNamespaceToCIMode;
      if (lng?.toLowerCase() === "cimode") {
        if (appendNamespaceToCIMode) {
          if (returnDetails) {
            return {
              res: `${namespace}${nsSeparator}${key}`,
              usedKey: key,
              exactUsedKey: key,
              usedLng: lng,
              usedNS: namespace,
              usedParams: this.getUsedParamsDetails(opt)
            };
          }
          return `${namespace}${nsSeparator}${key}`;
        }
        if (returnDetails) {
          return {
            res: key,
            usedKey: key,
            exactUsedKey: key,
            usedLng: lng,
            usedNS: namespace,
            usedParams: this.getUsedParamsDetails(opt)
          };
        }
        return key;
      }
      const resolved = this.resolve(keys, opt);
      let res = resolved?.res;
      const resUsedKey = resolved?.usedKey || key;
      const resExactUsedKey = resolved?.exactUsedKey || key;
      const noObject = ["[object Number]", "[object Function]", "[object RegExp]"];
      const joinArrays = opt.joinArrays !== void 0 ? opt.joinArrays : this.options.joinArrays;
      const handleAsObjectInI18nFormat = !this.i18nFormat || this.i18nFormat.handleAsObject;
      const needsPluralHandling = opt.count !== void 0 && !isString(opt.count);
      const hasDefaultValue = _Translator.hasDefaultValue(opt);
      const defaultValueSuffix = needsPluralHandling ? this.pluralResolver.getSuffix(lng, opt.count, opt) : "";
      const defaultValueSuffixOrdinalFallback = opt.ordinal && needsPluralHandling ? this.pluralResolver.getSuffix(lng, opt.count, {
        ordinal: false
      }) : "";
      const needsZeroSuffixLookup = needsPluralHandling && !opt.ordinal && opt.count === 0;
      const defaultValue = needsZeroSuffixLookup && opt[`defaultValue${this.options.pluralSeparator}zero`] || opt[`defaultValue${defaultValueSuffix}`] || opt[`defaultValue${defaultValueSuffixOrdinalFallback}`] || opt.defaultValue;
      let resForObjHndl = res;
      if (handleAsObjectInI18nFormat && !res && hasDefaultValue) {
        resForObjHndl = defaultValue;
      }
      const handleAsObject = shouldHandleAsObject(resForObjHndl);
      const resType = Object.prototype.toString.apply(resForObjHndl);
      if (handleAsObjectInI18nFormat && resForObjHndl && handleAsObject && !noObject.includes(resType) && !(isString(joinArrays) && Array.isArray(resForObjHndl))) {
        if (!opt.returnObjects && !this.options.returnObjects) {
          if (!this.options.returnedObjectHandler) {
            this.logger.warn("accessing an object - but returnObjects options is not enabled!");
          }
          const r = this.options.returnedObjectHandler ? this.options.returnedObjectHandler(resUsedKey, resForObjHndl, {
            ...opt,
            ns: namespaces
          }) : `key '${key} (${this.language})' returned an object instead of string.`;
          if (returnDetails) {
            resolved.res = r;
            resolved.usedParams = this.getUsedParamsDetails(opt);
            return resolved;
          }
          return r;
        }
        if (keySeparator) {
          const resTypeIsArray = Array.isArray(resForObjHndl);
          const copy2 = resTypeIsArray ? [] : {};
          const newKeyToUse = resTypeIsArray ? resExactUsedKey : resUsedKey;
          for (const m in resForObjHndl) {
            if (Object.prototype.hasOwnProperty.call(resForObjHndl, m)) {
              const deepKey = `${newKeyToUse}${keySeparator}${m}`;
              if (hasDefaultValue && !res) {
                copy2[m] = this.translate(deepKey, {
                  ...opt,
                  defaultValue: shouldHandleAsObject(defaultValue) ? defaultValue[m] : void 0,
                  ...{
                    joinArrays: false,
                    ns: namespaces
                  }
                });
              } else {
                copy2[m] = this.translate(deepKey, {
                  ...opt,
                  ...{
                    joinArrays: false,
                    ns: namespaces
                  }
                });
              }
              if (copy2[m] === deepKey) copy2[m] = resForObjHndl[m];
            }
          }
          res = copy2;
        }
      } else if (handleAsObjectInI18nFormat && isString(joinArrays) && Array.isArray(res)) {
        res = res.join(joinArrays);
        if (res) res = this.extendTranslation(res, keys, opt, lastKey);
      } else {
        let usedDefault = false;
        let usedKey = false;
        if (!this.isValidLookup(res) && hasDefaultValue) {
          usedDefault = true;
          res = defaultValue;
        }
        if (!this.isValidLookup(res)) {
          usedKey = true;
          res = key;
        }
        const missingKeyNoValueFallbackToKey = opt.missingKeyNoValueFallbackToKey || this.options.missingKeyNoValueFallbackToKey;
        const resForMissing = missingKeyNoValueFallbackToKey && usedKey ? void 0 : res;
        const updateMissing = hasDefaultValue && defaultValue !== res && this.options.updateMissing;
        if (usedKey || usedDefault || updateMissing) {
          this.logger.log(updateMissing ? "updateKey" : "missingKey", lng, namespace, needsPluralHandling && !updateMissing ? `${key}${this.pluralResolver.getSuffix(lng, opt.count, opt)}` : key, updateMissing ? defaultValue : res);
          if (keySeparator) {
            const fk = this.resolve(key, {
              ...opt,
              keySeparator: false
            });
            if (fk && fk.res) this.logger.warn("Seems the loaded translations were in flat JSON format instead of nested. Either set keySeparator: false on init or make sure your translations are published in nested format.");
          }
          let lngs = [];
          const fallbackLngs = this.languageUtils.getFallbackCodes(this.options.fallbackLng, opt.lng || this.language);
          if (this.options.saveMissingTo === "fallback" && fallbackLngs && fallbackLngs[0]) {
            for (let i = 0; i < fallbackLngs.length; i++) {
              lngs.push(fallbackLngs[i]);
            }
          } else if (this.options.saveMissingTo === "all") {
            lngs = this.languageUtils.toResolveHierarchy(opt.lng || this.language);
          } else {
            lngs.push(opt.lng || this.language);
          }
          const send = (l, k, specificDefaultValue) => {
            const defaultForMissing = hasDefaultValue && specificDefaultValue !== res ? specificDefaultValue : resForMissing;
            if (this.options.missingKeyHandler) {
              this.options.missingKeyHandler(l, namespace, k, defaultForMissing, updateMissing, opt);
            } else if (this.backendConnector?.saveMissing) {
              this.backendConnector.saveMissing(l, namespace, k, defaultForMissing, updateMissing, opt);
            }
            this.emit("missingKey", l, namespace, k, res);
          };
          if (this.options.saveMissing) {
            if (this.options.saveMissingPlurals && needsPluralHandling) {
              lngs.forEach((language) => {
                const suffixes = this.pluralResolver.getSuffixes(language, opt);
                if (needsZeroSuffixLookup && opt[`defaultValue${this.options.pluralSeparator}zero`] && !suffixes.includes(`${this.options.pluralSeparator}zero`)) {
                  suffixes.push(`${this.options.pluralSeparator}zero`);
                }
                suffixes.forEach((suffix) => {
                  send([language], key + suffix, opt[`defaultValue${suffix}`] || defaultValue);
                });
              });
            } else {
              send(lngs, key, defaultValue);
            }
          }
        }
        res = this.extendTranslation(res, keys, opt, resolved, lastKey);
        if (usedKey && res === key && this.options.appendNamespaceToMissingKey) {
          res = `${namespace}${nsSeparator}${key}`;
        }
        if ((usedKey || usedDefault) && this.options.parseMissingKeyHandler) {
          res = this.options.parseMissingKeyHandler(this.options.appendNamespaceToMissingKey ? `${namespace}${nsSeparator}${key}` : key, usedDefault ? res : void 0, opt);
        }
      }
      if (returnDetails) {
        resolved.res = res;
        resolved.usedParams = this.getUsedParamsDetails(opt);
        return resolved;
      }
      return res;
    }
    extendTranslation(res, key, opt, resolved, lastKey) {
      if (this.i18nFormat?.parse) {
        res = this.i18nFormat.parse(res, {
          ...this.options.interpolation.defaultVariables,
          ...opt
        }, opt.lng || this.language || resolved.usedLng, resolved.usedNS, resolved.usedKey, {
          resolved
        });
      } else if (!opt.skipInterpolation) {
        if (opt.interpolation) this.interpolator.init({
          ...opt,
          ...{
            interpolation: {
              ...this.options.interpolation,
              ...opt.interpolation
            }
          }
        });
        const skipOnVariables = isString(res) && (opt?.interpolation?.skipOnVariables !== void 0 ? opt.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables);
        let nestBef;
        if (skipOnVariables) {
          const nb = res.match(this.interpolator.nestingRegexp);
          nestBef = nb && nb.length;
        }
        let data = opt.replace && !isString(opt.replace) ? opt.replace : opt;
        if (this.options.interpolation.defaultVariables) data = {
          ...this.options.interpolation.defaultVariables,
          ...data
        };
        res = this.interpolator.interpolate(res, data, opt.lng || this.language || resolved.usedLng, opt);
        if (skipOnVariables) {
          const na = res.match(this.interpolator.nestingRegexp);
          const nestAft = na && na.length;
          if (nestBef < nestAft) opt.nest = false;
        }
        if (!opt.lng && resolved && resolved.res) opt.lng = this.language || resolved.usedLng;
        if (opt.nest !== false) res = this.interpolator.nest(res, (...args) => {
          if (lastKey?.[0] === args[0] && !opt.context) {
            this.logger.warn(`It seems you are nesting recursively key: ${args[0]} in key: ${key[0]}`);
            return null;
          }
          return this.translate(...args, key);
        }, opt);
        if (opt.interpolation) this.interpolator.reset();
      }
      const postProcess = opt.postProcess || this.options.postProcess;
      const postProcessorNames = isString(postProcess) ? [postProcess] : postProcess;
      if (res != null && postProcessorNames?.length && opt.applyPostProcessor !== false) {
        res = postProcessor.handle(postProcessorNames, res, key, this.options && this.options.postProcessPassResolved ? {
          i18nResolved: {
            ...resolved,
            usedParams: this.getUsedParamsDetails(opt)
          },
          ...opt
        } : opt, this);
      }
      return res;
    }
    resolve(keys, opt = {}) {
      let found;
      let usedKey;
      let exactUsedKey;
      let usedLng;
      let usedNS;
      if (isString(keys)) keys = [keys];
      if (Array.isArray(keys)) keys = keys.map((k) => typeof k === "function" ? keysFromSelector(k, {
        ...this.options,
        ...opt
      }) : k);
      keys.forEach((k) => {
        if (this.isValidLookup(found)) return;
        const extracted = this.extractFromKey(k, opt);
        const key = extracted.key;
        usedKey = key;
        let namespaces = extracted.namespaces;
        if (this.options.fallbackNS) namespaces = namespaces.concat(this.options.fallbackNS);
        const needsPluralHandling = opt.count !== void 0 && !isString(opt.count);
        const needsZeroSuffixLookup = needsPluralHandling && !opt.ordinal && opt.count === 0;
        const needsContextHandling = opt.context !== void 0 && (isString(opt.context) || typeof opt.context === "number") && opt.context !== "";
        const codes = opt.lngs ? opt.lngs : this.languageUtils.toResolveHierarchy(opt.lng || this.language, opt.fallbackLng);
        namespaces.forEach((ns) => {
          if (this.isValidLookup(found)) return;
          usedNS = ns;
          if (!this.checkedLoadedFor[`${codes[0]}-${ns}`] && this.utils?.hasLoadedNamespace && !this.utils?.hasLoadedNamespace(usedNS)) {
            this.checkedLoadedFor[`${codes[0]}-${ns}`] = true;
            this.logger.warn(`key "${usedKey}" for languages "${codes.join(", ")}" won't get resolved as namespace "${usedNS}" was not yet loaded`, "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!");
          }
          codes.forEach((code) => {
            if (this.isValidLookup(found)) return;
            usedLng = code;
            const finalKeys = [key];
            if (this.i18nFormat?.addLookupKeys) {
              this.i18nFormat.addLookupKeys(finalKeys, key, code, ns, opt);
            } else {
              let pluralSuffix;
              if (needsPluralHandling) pluralSuffix = this.pluralResolver.getSuffix(code, opt.count, opt);
              const zeroSuffix = `${this.options.pluralSeparator}zero`;
              const ordinalPrefix = `${this.options.pluralSeparator}ordinal${this.options.pluralSeparator}`;
              if (needsPluralHandling) {
                if (opt.ordinal && pluralSuffix.startsWith(ordinalPrefix)) {
                  finalKeys.push(key + pluralSuffix.replace(ordinalPrefix, this.options.pluralSeparator));
                }
                finalKeys.push(key + pluralSuffix);
                if (needsZeroSuffixLookup) {
                  finalKeys.push(key + zeroSuffix);
                }
              }
              if (needsContextHandling) {
                const contextKey = `${key}${this.options.contextSeparator || "_"}${opt.context}`;
                finalKeys.push(contextKey);
                if (needsPluralHandling) {
                  if (opt.ordinal && pluralSuffix.startsWith(ordinalPrefix)) {
                    finalKeys.push(contextKey + pluralSuffix.replace(ordinalPrefix, this.options.pluralSeparator));
                  }
                  finalKeys.push(contextKey + pluralSuffix);
                  if (needsZeroSuffixLookup) {
                    finalKeys.push(contextKey + zeroSuffix);
                  }
                }
              }
            }
            let possibleKey;
            while (possibleKey = finalKeys.pop()) {
              if (!this.isValidLookup(found)) {
                exactUsedKey = possibleKey;
                found = this.getResource(code, ns, possibleKey, opt);
              }
            }
          });
        });
      });
      return {
        res: found,
        usedKey,
        exactUsedKey,
        usedLng,
        usedNS
      };
    }
    isValidLookup(res) {
      return res !== void 0 && !(!this.options.returnNull && res === null) && !(!this.options.returnEmptyString && res === "");
    }
    getResource(code, ns, key, options = {}) {
      if (this.i18nFormat?.getResource) return this.i18nFormat.getResource(code, ns, key, options);
      return this.resourceStore.getResource(code, ns, key, options);
    }
    getUsedParamsDetails(options = {}) {
      const optionsKeys = ["defaultValue", "ordinal", "context", "replace", "lng", "lngs", "fallbackLng", "ns", "keySeparator", "nsSeparator", "returnObjects", "returnDetails", "joinArrays", "postProcess", "interpolation"];
      const useOptionsReplaceForData = options.replace && !isString(options.replace);
      let data = useOptionsReplaceForData ? options.replace : options;
      if (useOptionsReplaceForData && typeof options.count !== "undefined") {
        data = {
          ...data,
          count: options.count
        };
      }
      if (this.options.interpolation.defaultVariables) {
        data = {
          ...this.options.interpolation.defaultVariables,
          ...data
        };
      }
      if (!useOptionsReplaceForData) {
        data = {
          ...data
        };
        for (const key of optionsKeys) {
          delete data[key];
        }
      }
      return data;
    }
    static hasDefaultValue(options) {
      const prefix = "defaultValue";
      for (const option in options) {
        if (Object.prototype.hasOwnProperty.call(options, option) && option.startsWith(prefix) && void 0 !== options[option]) {
          return true;
        }
      }
      return false;
    }
  };
  var LanguageUtil = class {
    constructor(options) {
      this.options = options;
      this.supportedLngs = this.options.supportedLngs || false;
      this.logger = baseLogger.create("languageUtils");
      this.resolveHierarchyCache = {};
    }
    clearCache() {
      this.resolveHierarchyCache = {};
    }
    getScriptPartFromCode(code) {
      code = getCleanedCode(code);
      if (!code || !code.includes("-")) return null;
      const p = code.split("-");
      if (p.length === 2) return null;
      p.pop();
      if (p[p.length - 1].toLowerCase() === "x") return null;
      return this.formatLanguageCode(p.join("-"));
    }
    getLanguagePartFromCode(code) {
      code = getCleanedCode(code);
      if (!code || !code.includes("-")) return code;
      const p = code.split("-");
      return this.formatLanguageCode(p[0]);
    }
    formatLanguageCode(code) {
      if (isString(code) && code.includes("-")) {
        let formattedCode;
        try {
          formattedCode = Intl.getCanonicalLocales(code)[0];
        } catch (e) {
        }
        if (formattedCode && this.options.lowerCaseLng) {
          formattedCode = formattedCode.toLowerCase();
        }
        if (formattedCode) return formattedCode;
        if (this.options.lowerCaseLng) {
          return code.toLowerCase();
        }
        return code;
      }
      return this.options.cleanCode || this.options.lowerCaseLng ? code.toLowerCase() : code;
    }
    isSupportedCode(code) {
      if (this.options.load === "languageOnly" || this.options.nonExplicitSupportedLngs) {
        code = this.getLanguagePartFromCode(code);
      }
      return !this.supportedLngs || !this.supportedLngs.length || this.supportedLngs.includes(code);
    }
    getBestMatchFromCodes(codes) {
      if (!codes) return null;
      let found;
      codes.forEach((code) => {
        if (found) return;
        const cleanedLng = this.formatLanguageCode(code);
        if (!this.options.supportedLngs || this.isSupportedCode(cleanedLng)) found = cleanedLng;
      });
      if (!found && this.options.supportedLngs) {
        codes.forEach((code) => {
          if (found) return;
          const lngScOnly = this.getScriptPartFromCode(code);
          if (this.isSupportedCode(lngScOnly)) return found = lngScOnly;
          const lngOnly = this.getLanguagePartFromCode(code);
          if (this.isSupportedCode(lngOnly)) return found = lngOnly;
          found = this.options.supportedLngs.find((supportedLng) => {
            if (supportedLng === lngOnly) return true;
            if (!supportedLng.includes("-") && !lngOnly.includes("-")) return false;
            if (supportedLng.includes("-") && !lngOnly.includes("-") && supportedLng.slice(0, supportedLng.indexOf("-")) === lngOnly) return true;
            if (supportedLng.startsWith(lngOnly) && lngOnly.length > 1) return true;
            return false;
          });
        });
      }
      if (!found) found = this.getFallbackCodes(this.options.fallbackLng)[0];
      return found;
    }
    getFallbackCodes(fallbacks, code) {
      if (!fallbacks) return [];
      if (typeof fallbacks === "function") fallbacks = fallbacks(code);
      if (isString(fallbacks)) fallbacks = [fallbacks];
      if (Array.isArray(fallbacks)) return fallbacks;
      if (!code) return fallbacks.default || [];
      let found = fallbacks[code];
      if (!found) found = fallbacks[this.getScriptPartFromCode(code)];
      if (!found) found = fallbacks[this.formatLanguageCode(code)];
      if (!found) found = fallbacks[this.getLanguagePartFromCode(code)];
      if (!found) found = fallbacks.default;
      return found || [];
    }
    toResolveHierarchy(code, fallbackCode) {
      const fallbackLng = this.options.fallbackLng;
      const fallbackLngKey = Array.isArray(fallbackLng) ? fallbackLng.join("|") : fallbackLng;
      if (fallbackLngKey !== this._cachedFallbackLng) {
        this.resolveHierarchyCache = {};
        this._cachedFallbackLng = fallbackLngKey;
      }
      const hasCacheableFallback = fallbackCode === void 0 || fallbackCode === false || isString(fallbackCode);
      const usesUncacheableOptionsFallback = fallbackCode === void 0 && typeof this.options.fallbackLng === "function";
      const cacheable = isString(code) && hasCacheableFallback && !usesUncacheableOptionsFallback;
      let cacheKey = null;
      if (cacheable) {
        let fallbackCacheKey;
        if (fallbackCode === void 0) fallbackCacheKey = "undefined";
        else if (fallbackCode === false) fallbackCacheKey = "boolean:false";
        else fallbackCacheKey = `string:${fallbackCode}`;
        cacheKey = `${code.length}:${code}|${fallbackCacheKey}`;
      }
      if (cacheKey !== null) {
        const cached = this.resolveHierarchyCache[cacheKey];
        if (cached !== void 0) return cached.slice();
      }
      const fallbackCodes = this.getFallbackCodes((fallbackCode === false ? [] : fallbackCode) || this.options.fallbackLng || [], code);
      const codes = [];
      const addCode = (c) => {
        if (!c) return;
        if (this.isSupportedCode(c)) {
          codes.push(c);
        } else {
          this.logger.warn(`rejecting language code not found in supportedLngs: ${c}`);
        }
      };
      if (isString(code) && (code.includes("-") || code.includes("_"))) {
        if (this.options.load !== "languageOnly") addCode(this.formatLanguageCode(code));
        if (this.options.load !== "languageOnly" && this.options.load !== "currentOnly") addCode(this.getScriptPartFromCode(code));
        if (this.options.load !== "currentOnly") addCode(this.getLanguagePartFromCode(code));
      } else if (isString(code)) {
        addCode(this.formatLanguageCode(code));
      }
      fallbackCodes.forEach((fc) => {
        if (!codes.includes(fc)) addCode(this.formatLanguageCode(fc));
      });
      if (cacheKey !== null) {
        this.resolveHierarchyCache[cacheKey] = codes;
        return codes.slice();
      }
      return codes;
    }
  };
  var suffixesOrder = {
    zero: 0,
    one: 1,
    two: 2,
    few: 3,
    many: 4,
    other: 5
  };
  var dummyRule = {
    select: (count) => count === 1 ? "one" : "other",
    resolvedOptions: () => ({
      pluralCategories: ["one", "other"]
    })
  };
  var PluralResolver = class {
    constructor(languageUtils, options = {}) {
      this.languageUtils = languageUtils;
      this.options = options;
      this.logger = baseLogger.create("pluralResolver");
      this.pluralRulesCache = {};
    }
    clearCache() {
      this.pluralRulesCache = {};
    }
    getRule(code, options = {}) {
      const cleanedCode = getCleanedCode(code === "dev" ? "en" : code);
      const type = options.ordinal ? "ordinal" : "cardinal";
      const cacheKey = JSON.stringify({
        cleanedCode,
        type
      });
      if (cacheKey in this.pluralRulesCache) {
        return this.pluralRulesCache[cacheKey];
      }
      let rule;
      try {
        rule = new Intl.PluralRules(cleanedCode, {
          type
        });
      } catch (err) {
        if (typeof Intl === "undefined") {
          this.logger.error("No Intl support, please use an Intl polyfill!");
          return dummyRule;
        }
        if (!code.match(/-|_/)) return dummyRule;
        const lngPart = this.languageUtils.getLanguagePartFromCode(code);
        rule = this.getRule(lngPart, options);
      }
      this.pluralRulesCache[cacheKey] = rule;
      return rule;
    }
    needsPlural(code, options = {}) {
      let rule = this.getRule(code, options);
      if (!rule) rule = this.getRule("dev", options);
      return rule?.resolvedOptions().pluralCategories.length > 1;
    }
    getPluralFormsOfKey(code, key, options = {}) {
      return this.getSuffixes(code, options).map((suffix) => `${key}${suffix}`);
    }
    getSuffixes(code, options = {}) {
      let rule = this.getRule(code, options);
      if (!rule) rule = this.getRule("dev", options);
      if (!rule) return [];
      return rule.resolvedOptions().pluralCategories.sort((pluralCategory1, pluralCategory2) => suffixesOrder[pluralCategory1] - suffixesOrder[pluralCategory2]).map((pluralCategory) => `${this.options.prepend}${options.ordinal ? `ordinal${this.options.prepend}` : ""}${pluralCategory}`);
    }
    getSuffix(code, count, options = {}) {
      const rule = this.getRule(code, options);
      if (rule) {
        return `${this.options.prepend}${options.ordinal ? `ordinal${this.options.prepend}` : ""}${rule.select(count)}`;
      }
      this.logger.warn(`no plural rule found for: ${code}`);
      return this.getSuffix("dev", count, options);
    }
  };
  var deepFindWithDefaults = (data, defaultData, key, keySeparator = ".", ignoreJSONStructure = true) => {
    let path = getPathWithDefaults(data, defaultData, key);
    if (!path && ignoreJSONStructure && isString(key)) {
      path = deepFind(data, key, keySeparator);
      if (path === void 0) path = deepFind(defaultData, key, keySeparator);
    }
    return path;
  };
  var regexSafe = (val) => val.replace(/\$/g, "$$$$");
  var Interpolator = class {
    constructor(options = {}) {
      this.logger = baseLogger.create("interpolator");
      this.options = options;
      this.format = options?.interpolation?.format || ((value) => value);
      this.init(options);
    }
    init(options = {}) {
      if (!options.interpolation) options.interpolation = {
        escapeValue: true
      };
      const {
        escape: escape$1,
        escapeValue,
        useRawValueToEscape,
        prefix,
        prefixEscaped,
        suffix,
        suffixEscaped,
        formatSeparator,
        unescapeSuffix,
        unescapePrefix,
        nestingPrefix,
        nestingPrefixEscaped,
        nestingSuffix,
        nestingSuffixEscaped,
        nestingOptionsSeparator,
        maxReplaces,
        alwaysFormat
      } = options.interpolation;
      this.escape = escape$1 !== void 0 ? escape$1 : escape;
      this.escapeValue = escapeValue !== void 0 ? escapeValue : true;
      this.useRawValueToEscape = useRawValueToEscape !== void 0 ? useRawValueToEscape : false;
      this.prefix = prefix ? regexEscape(prefix) : prefixEscaped || "{{";
      this.suffix = suffix ? regexEscape(suffix) : suffixEscaped || "}}";
      this.formatSeparator = formatSeparator || ",";
      this.unescapePrefix = unescapeSuffix ? "" : unescapePrefix ? regexEscape(unescapePrefix) : "-";
      this.unescapeSuffix = this.unescapePrefix ? "" : unescapeSuffix ? regexEscape(unescapeSuffix) : "";
      this.nestingPrefix = nestingPrefix ? regexEscape(nestingPrefix) : nestingPrefixEscaped || regexEscape("$t(");
      this.nestingSuffix = nestingSuffix ? regexEscape(nestingSuffix) : nestingSuffixEscaped || regexEscape(")");
      this.nestingOptionsSeparator = nestingOptionsSeparator || ",";
      this.maxReplaces = maxReplaces || 1e3;
      this.alwaysFormat = alwaysFormat !== void 0 ? alwaysFormat : false;
      this.resetRegExp();
    }
    reset() {
      if (this.options) this.init(this.options);
    }
    resetRegExp() {
      const getOrResetRegExp = (existingRegExp, pattern) => {
        if (existingRegExp?.source === pattern) {
          existingRegExp.lastIndex = 0;
          return existingRegExp;
        }
        return new RegExp(pattern, "g");
      };
      this.regexp = getOrResetRegExp(this.regexp, `${this.prefix}(.+?)${this.suffix}`);
      this.regexpUnescape = getOrResetRegExp(this.regexpUnescape, `${this.prefix}${this.unescapePrefix}(.+?)${this.unescapeSuffix}${this.suffix}`);
      this.nestingRegexp = getOrResetRegExp(this.nestingRegexp, `${this.nestingPrefix}((?:[^()"']+|"[^"]*"|'[^']*'|\\((?:[^()]|"[^"]*"|'[^']*')*\\))*?)${this.nestingSuffix}`);
    }
    interpolate(str, data, lng, options) {
      let match;
      let value;
      let replaces;
      const defaultData = this.options && this.options.interpolation && this.options.interpolation.defaultVariables || {};
      const handleFormat = (key) => {
        if (!key.includes(this.formatSeparator)) {
          const path = deepFindWithDefaults(data, defaultData, key, this.options.keySeparator, this.options.ignoreJSONStructure);
          return this.alwaysFormat ? this.format(path, void 0, lng, {
            ...options,
            ...data,
            interpolationkey: key
          }) : path;
        }
        const p = key.split(this.formatSeparator);
        const k = p.shift().trim();
        const f = p.join(this.formatSeparator).trim();
        return this.format(deepFindWithDefaults(data, defaultData, k, this.options.keySeparator, this.options.ignoreJSONStructure), f, lng, {
          ...options,
          ...data,
          interpolationkey: k
        });
      };
      this.resetRegExp();
      if (!this.escapeValue && typeof str === "string" && /\$t\([^)]*\{[^}]*\{\{/.test(str)) {
        this.logger.warn("nesting options string contains interpolated variables with escapeValue: false \u2014 if any of those values are attacker-controlled they can inject additional nesting options (e.g. redirect lng/ns). Sanitise untrusted input before passing it to t(), or keep escapeValue: true.");
      }
      const missingInterpolationHandler = options?.missingInterpolationHandler || this.options.missingInterpolationHandler;
      const skipOnVariables = options?.interpolation?.skipOnVariables !== void 0 ? options.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables;
      const todos = [{
        regex: this.regexpUnescape,
        safeValue: (val) => val
      }, {
        regex: this.regexp,
        safeValue: (val) => this.escapeValue ? this.escape(val) : val
      }];
      todos.forEach((todo) => {
        replaces = 0;
        while (match = todo.regex.exec(str)) {
          const matchedVar = match[1].trim();
          value = handleFormat(matchedVar);
          if (value === void 0) {
            if (typeof missingInterpolationHandler === "function") {
              const temp = missingInterpolationHandler(str, match, options);
              value = isString(temp) ? temp : "";
            } else if (options && Object.prototype.hasOwnProperty.call(options, matchedVar)) {
              value = "";
            } else if (skipOnVariables) {
              value = match[0];
              continue;
            } else {
              this.logger.warn(`missed to pass in variable ${matchedVar} for interpolating ${str}`);
              value = "";
            }
          } else if (!isString(value) && !this.useRawValueToEscape) {
            value = makeString(value);
          }
          const safeValue = todo.safeValue(value);
          str = str.replace(match[0], regexSafe(safeValue));
          if (skipOnVariables) {
            todo.regex.lastIndex += safeValue.length;
            todo.regex.lastIndex -= match[0].length;
          } else {
            todo.regex.lastIndex = 0;
          }
          replaces++;
          if (replaces >= this.maxReplaces) {
            break;
          }
        }
      });
      return str;
    }
    nest(str, fc, options = {}) {
      let match;
      let value;
      let clonedOptions;
      const handleHasOptions = (key, inheritedOptions) => {
        const sep = this.nestingOptionsSeparator;
        if (!key.includes(sep)) return key;
        const c = key.split(new RegExp(`${regexEscape(sep)}[ ]*{`));
        let optionsString = `{${c[1]}`;
        key = c[0];
        optionsString = this.interpolate(optionsString, clonedOptions);
        const matchedSingleQuotes = optionsString.match(/'/g);
        const matchedDoubleQuotes = optionsString.match(/"/g);
        if ((matchedSingleQuotes?.length ?? 0) % 2 === 0 && !matchedDoubleQuotes || (matchedDoubleQuotes?.length ?? 0) % 2 !== 0) {
          optionsString = optionsString.replace(/'/g, '"');
        }
        try {
          clonedOptions = JSON.parse(optionsString);
          if (inheritedOptions) clonedOptions = {
            ...inheritedOptions,
            ...clonedOptions
          };
        } catch (e) {
          this.logger.warn(`failed parsing options string in nesting for key ${key}`, e);
          return `${key}${sep}${optionsString}`;
        }
        if (clonedOptions.defaultValue && clonedOptions.defaultValue.includes(this.prefix)) delete clonedOptions.defaultValue;
        return key;
      };
      while (match = this.nestingRegexp.exec(str)) {
        let formatters = [];
        clonedOptions = {
          ...options
        };
        clonedOptions = clonedOptions.replace && !isString(clonedOptions.replace) ? clonedOptions.replace : clonedOptions;
        clonedOptions.applyPostProcessor = false;
        delete clonedOptions.defaultValue;
        const keyEndIndex = /{.*}/s.test(match[1]) ? match[1].lastIndexOf("}") + 1 : match[1].indexOf(this.formatSeparator);
        if (keyEndIndex !== -1) {
          formatters = match[1].slice(keyEndIndex).split(this.formatSeparator).map((elem) => elem.trim()).filter(Boolean);
          match[1] = match[1].slice(0, keyEndIndex);
        }
        value = fc(handleHasOptions.call(this, match[1].trim(), clonedOptions), clonedOptions);
        if (value && match[0] === str && !isString(value)) return value;
        if (!isString(value)) value = makeString(value);
        if (!value) {
          this.logger.warn(`missed to resolve ${match[1]} for nesting ${str}`);
          value = "";
        }
        if (formatters.length) {
          value = formatters.reduce((v, f) => this.format(v, f, options.lng, {
            ...options,
            interpolationkey: match[1].trim()
          }), value.trim());
        }
        str = str.replace(match[0], regexSafe(makeString(value)));
        this.regexp.lastIndex = 0;
      }
      return str;
    }
  };
  var parseFormatStr = (formatStr) => {
    let formatName = formatStr.toLowerCase().trim();
    const formatOptions = {};
    if (formatStr.includes("(")) {
      const p = formatStr.split("(");
      formatName = p[0].toLowerCase().trim();
      const optStr = p[1].slice(0, -1);
      if (formatName === "currency" && !optStr.includes(":")) {
        if (!formatOptions.currency) formatOptions.currency = optStr.trim();
      } else if (formatName === "relativetime" && !optStr.includes(":")) {
        if (!formatOptions.range) formatOptions.range = optStr.trim();
      } else {
        const opts = optStr.split(";");
        opts.forEach((opt) => {
          if (opt) {
            const [key, ...rest] = opt.split(":");
            const val = rest.join(":").trim().replace(/^'+|'+$/g, "");
            const trimmedKey = key.trim();
            if (!formatOptions[trimmedKey]) formatOptions[trimmedKey] = val;
            if (val === "false") formatOptions[trimmedKey] = false;
            if (val === "true") formatOptions[trimmedKey] = true;
            if (!isNaN(val)) formatOptions[trimmedKey] = parseInt(val, 10);
          }
        });
      }
    }
    return {
      formatName,
      formatOptions
    };
  };
  var createCachedFormatter = (fn) => {
    const cache = {};
    return (v, l, o) => {
      let optForCache = o;
      if (o && o.interpolationkey && o.formatParams && o.formatParams[o.interpolationkey] && o[o.interpolationkey]) {
        optForCache = {
          ...optForCache,
          [o.interpolationkey]: void 0
        };
      }
      const key = l + JSON.stringify(optForCache);
      let frm = cache[key];
      if (!frm) {
        frm = fn(getCleanedCode(l), o);
        cache[key] = frm;
      }
      return frm(v);
    };
  };
  var createNonCachedFormatter = (fn) => (v, l, o) => fn(getCleanedCode(l), o)(v);
  var Formatter = class {
    constructor(options = {}) {
      this.logger = baseLogger.create("formatter");
      this.options = options;
      this.init(options);
    }
    init(services, options = {
      interpolation: {}
    }) {
      this.formatSeparator = options.interpolation.formatSeparator || ",";
      const cf = options.cacheInBuiltFormats ? createCachedFormatter : createNonCachedFormatter;
      this.formats = {
        number: cf((lng, opt) => {
          const formatter = new Intl.NumberFormat(lng, {
            ...opt
          });
          return (val) => formatter.format(val);
        }),
        currency: cf((lng, opt) => {
          const formatter = new Intl.NumberFormat(lng, {
            ...opt,
            style: "currency"
          });
          return (val) => formatter.format(val);
        }),
        datetime: cf((lng, opt) => {
          const formatter = new Intl.DateTimeFormat(lng, {
            ...opt
          });
          return (val) => formatter.format(val);
        }),
        relativetime: cf((lng, opt) => {
          const formatter = new Intl.RelativeTimeFormat(lng, {
            ...opt
          });
          return (val) => formatter.format(val, opt.range || "day");
        }),
        list: cf((lng, opt) => {
          const formatter = new Intl.ListFormat(lng, {
            ...opt
          });
          return (val) => formatter.format(val);
        })
      };
    }
    add(name, fc) {
      this.formats[name.toLowerCase().trim()] = fc;
    }
    addCached(name, fc) {
      this.formats[name.toLowerCase().trim()] = createCachedFormatter(fc);
    }
    format(value, format, lng, options = {}) {
      if (!format) return value;
      if (value == null) return value;
      const rawFormats = format.split(this.formatSeparator);
      const formats = [];
      for (let i = 0; i < rawFormats.length; i++) {
        let f = rawFormats[i];
        while (f.indexOf("(") > -1 && !f.includes(")") && i + 1 < rawFormats.length) {
          f = `${f}${this.formatSeparator}${rawFormats[++i]}`;
        }
        formats.push(f);
      }
      const result = formats.reduce((mem, f) => {
        const {
          formatName,
          formatOptions
        } = parseFormatStr(f);
        if (this.formats[formatName]) {
          let formatted = mem;
          try {
            const valOptions = options?.formatParams?.[options.interpolationkey] || {};
            const l = valOptions.locale || valOptions.lng || options.locale || options.lng || lng;
            formatted = this.formats[formatName](mem, l, {
              ...formatOptions,
              ...options,
              ...valOptions
            });
          } catch (error) {
            this.logger.warn(error);
          }
          return formatted;
        } else {
          this.logger.warn(`there was no format function for ${formatName}`);
        }
        return mem;
      }, value);
      return result;
    }
  };
  var removePending = (q, name) => {
    if (q.pending[name] !== void 0) {
      delete q.pending[name];
      q.pendingCount--;
    }
  };
  var Connector = class extends EventEmitter {
    constructor(backend, store, services, options = {}) {
      super();
      this.backend = backend;
      this.store = store;
      this.services = services;
      this.languageUtils = services.languageUtils;
      this.options = options;
      this.logger = baseLogger.create("backendConnector");
      this.waitingReads = [];
      this.maxParallelReads = options.maxParallelReads || 10;
      this.readingCalls = 0;
      this.maxRetries = options.maxRetries >= 0 ? options.maxRetries : 5;
      this.retryTimeout = options.retryTimeout >= 1 ? options.retryTimeout : 350;
      this.state = {};
      this.queue = [];
      this.backend?.init?.(services, options.backend, options);
    }
    queueLoad(languages, namespaces, options, callback) {
      const toLoad = {};
      const pending = {};
      const toLoadLanguages = {};
      const toLoadNamespaces = {};
      languages.forEach((lng) => {
        let hasAllNamespaces = true;
        namespaces.forEach((ns) => {
          const name = `${lng}|${ns}`;
          if (!options.reload && this.store.hasResourceBundle(lng, ns)) {
            this.state[name] = 2;
          } else if (this.state[name] < 0) ;
          else if (this.state[name] === 1) {
            if (pending[name] === void 0) pending[name] = true;
          } else {
            this.state[name] = 1;
            hasAllNamespaces = false;
            if (pending[name] === void 0) pending[name] = true;
            if (toLoad[name] === void 0) toLoad[name] = true;
            if (toLoadNamespaces[ns] === void 0) toLoadNamespaces[ns] = true;
          }
        });
        if (!hasAllNamespaces) toLoadLanguages[lng] = true;
      });
      if (Object.keys(toLoad).length || Object.keys(pending).length) {
        this.queue.push({
          pending,
          pendingCount: Object.keys(pending).length,
          loaded: {},
          errors: [],
          callback
        });
      }
      return {
        toLoad: Object.keys(toLoad),
        pending: Object.keys(pending),
        toLoadLanguages: Object.keys(toLoadLanguages),
        toLoadNamespaces: Object.keys(toLoadNamespaces)
      };
    }
    loaded(name, err, data) {
      const s = name.split("|");
      const lng = s[0];
      const ns = s[1];
      if (err) this.emit("failedLoading", lng, ns, err);
      if (!err && data) {
        this.store.addResourceBundle(lng, ns, data, void 0, void 0, {
          skipCopy: true
        });
      }
      this.state[name] = err ? -1 : 2;
      if (err && data) this.state[name] = 0;
      const loaded = {};
      this.queue.forEach((q) => {
        pushPath(q.loaded, [lng], ns);
        removePending(q, name);
        if (err) q.errors.push(err);
        if (q.pendingCount === 0 && !q.done) {
          Object.keys(q.loaded).forEach((l) => {
            if (!loaded[l]) loaded[l] = {};
            const loadedKeys = q.loaded[l];
            if (loadedKeys.length) {
              loadedKeys.forEach((n) => {
                if (loaded[l][n] === void 0) loaded[l][n] = true;
              });
            }
          });
          q.done = true;
          if (q.errors.length) {
            q.callback(q.errors);
          } else {
            q.callback();
          }
        }
      });
      this.emit("loaded", loaded);
      this.queue = this.queue.filter((q) => !q.done);
    }
    read(lng, ns, fcName, tried = 0, wait = this.retryTimeout, callback) {
      if (!lng.length) return callback(null, {});
      if (this.readingCalls >= this.maxParallelReads) {
        this.waitingReads.push({
          lng,
          ns,
          fcName,
          tried,
          wait,
          callback
        });
        return;
      }
      this.readingCalls++;
      const resolver = (err, data) => {
        this.readingCalls--;
        if (this.waitingReads.length > 0) {
          const next = this.waitingReads.shift();
          this.read(next.lng, next.ns, next.fcName, next.tried, next.wait, next.callback);
        }
        if (err && data && tried < this.maxRetries) {
          setTimeout(() => {
            this.read(lng, ns, fcName, tried + 1, wait * 2, callback);
          }, wait);
          return;
        }
        callback(err, data);
      };
      const fc = this.backend[fcName].bind(this.backend);
      if (fc.length === 2) {
        try {
          const r = fc(lng, ns);
          if (r && typeof r.then === "function") {
            r.then((data) => resolver(null, data)).catch(resolver);
          } else {
            resolver(null, r);
          }
        } catch (err) {
          resolver(err);
        }
        return;
      }
      return fc(lng, ns, resolver);
    }
    prepareLoading(languages, namespaces, options = {}, callback) {
      if (!this.backend) {
        this.logger.warn("No backend was added via i18next.use. Will not load resources.");
        return callback && callback();
      }
      if (isString(languages)) languages = this.languageUtils.toResolveHierarchy(languages);
      if (isString(namespaces)) namespaces = [namespaces];
      const toLoad = this.queueLoad(languages, namespaces, options, callback);
      if (!toLoad.toLoad.length) {
        if (!toLoad.pending.length) callback();
        return null;
      }
      toLoad.toLoad.forEach((name) => {
        this.loadOne(name);
      });
    }
    load(languages, namespaces, callback) {
      this.prepareLoading(languages, namespaces, {}, callback);
    }
    reload(languages, namespaces, callback) {
      this.prepareLoading(languages, namespaces, {
        reload: true
      }, callback);
    }
    loadOne(name, prefix = "") {
      const s = name.split("|");
      const lng = s[0];
      const ns = s[1];
      this.read(lng, ns, "read", void 0, void 0, (err, data) => {
        if (err) this.logger.warn(`${prefix}loading namespace ${ns} for language ${lng} failed`, err);
        if (!err && data) this.logger.log(`${prefix}loaded namespace ${ns} for language ${lng}`, data);
        this.loaded(name, err, data);
      });
    }
    saveMissing(languages, namespace, key, fallbackValue, isUpdate, options = {}, clb = () => {
    }) {
      if (this.services?.utils?.hasLoadedNamespace && !this.services?.utils?.hasLoadedNamespace(namespace)) {
        this.logger.warn(`did not save key "${key}" as the namespace "${namespace}" was not yet loaded`, "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!");
        return;
      }
      if (key === void 0 || key === null || key === "") return;
      if (this.backend?.create) {
        const opts = {
          ...options,
          isUpdate
        };
        const fc = this.backend.create.bind(this.backend);
        if (fc.length < 6) {
          try {
            let r;
            if (fc.length === 5) {
              r = fc(languages, namespace, key, fallbackValue, opts);
            } else {
              r = fc(languages, namespace, key, fallbackValue);
            }
            if (r && typeof r.then === "function") {
              r.then((data) => clb(null, data)).catch(clb);
            } else {
              clb(null, r);
            }
          } catch (err) {
            clb(err);
          }
        } else {
          fc(languages, namespace, key, fallbackValue, clb, opts);
        }
      }
      if (!languages || !languages[0]) return;
      this.store.addResource(languages[0], namespace, key, fallbackValue);
    }
  };
  var get = () => ({
    debug: false,
    initAsync: true,
    ns: ["translation"],
    defaultNS: ["translation"],
    fallbackLng: ["dev"],
    fallbackNS: false,
    supportedLngs: false,
    nonExplicitSupportedLngs: false,
    load: "all",
    preload: false,
    keySeparator: ".",
    nsSeparator: ":",
    pluralSeparator: "_",
    contextSeparator: "_",
    enableSelector: false,
    partialBundledLanguages: false,
    saveMissing: false,
    updateMissing: false,
    saveMissingTo: "fallback",
    saveMissingPlurals: true,
    missingKeyHandler: false,
    missingInterpolationHandler: false,
    postProcess: false,
    postProcessPassResolved: false,
    returnNull: false,
    returnEmptyString: true,
    returnObjects: false,
    joinArrays: false,
    returnedObjectHandler: false,
    parseMissingKeyHandler: false,
    appendNamespaceToMissingKey: false,
    appendNamespaceToCIMode: false,
    overloadTranslationOptionHandler: (args) => {
      let ret = {};
      if (typeof args[1] === "object") ret = args[1];
      if (isString(args[1])) ret.defaultValue = args[1];
      if (isString(args[2])) ret.tDescription = args[2];
      if (typeof args[2] === "object" || typeof args[3] === "object") {
        const options = args[3] || args[2];
        Object.keys(options).forEach((key) => {
          ret[key] = options[key];
        });
      }
      return ret;
    },
    interpolation: {
      escapeValue: true,
      prefix: "{{",
      suffix: "}}",
      formatSeparator: ",",
      unescapePrefix: "-",
      nestingPrefix: "$t(",
      nestingSuffix: ")",
      nestingOptionsSeparator: ",",
      maxReplaces: 1e3,
      skipOnVariables: true
    },
    cacheInBuiltFormats: true
  });
  var transformOptions = (options) => {
    if (isString(options.ns)) options.ns = [options.ns];
    if (isString(options.fallbackLng)) options.fallbackLng = [options.fallbackLng];
    if (isString(options.fallbackNS)) options.fallbackNS = [options.fallbackNS];
    if (options.supportedLngs && !options.supportedLngs.includes("cimode")) {
      options.supportedLngs = options.supportedLngs.concat(["cimode"]);
    }
    return options;
  };
  var noop = () => {
  };
  var bindMemberFunctions = (inst) => {
    const mems = Object.getOwnPropertyNames(Object.getPrototypeOf(inst));
    mems.forEach((mem) => {
      if (typeof inst[mem] === "function") {
        inst[mem] = inst[mem].bind(inst);
      }
    });
  };
  var I18n = class _I18n extends EventEmitter {
    constructor(options = {}, callback) {
      super();
      this.options = transformOptions(options);
      this.services = {};
      this.logger = baseLogger;
      this.modules = {
        external: []
      };
      bindMemberFunctions(this);
      if (callback && !this.isInitialized && !options.isClone) {
        if (!this.options.initAsync) {
          this.init(options, callback);
          return this;
        }
        setTimeout(() => {
          this.init(options, callback);
        }, 0);
      }
    }
    init(options = {}, callback) {
      this.isInitializing = true;
      if (typeof options === "function") {
        callback = options;
        options = {};
      }
      if (options.defaultNS == null && options.ns) {
        if (isString(options.ns)) {
          options.defaultNS = options.ns;
        } else if (!options.ns.includes("translation")) {
          options.defaultNS = options.ns[0];
        }
      }
      const defOpts = get();
      this.options = {
        ...defOpts,
        ...this.options,
        ...transformOptions(options)
      };
      this.options.interpolation = {
        ...defOpts.interpolation,
        ...this.options.interpolation
      };
      if (options.keySeparator !== void 0) {
        this.options.userDefinedKeySeparator = options.keySeparator;
      }
      if (options.nsSeparator !== void 0) {
        this.options.userDefinedNsSeparator = options.nsSeparator;
      }
      if (typeof this.options.overloadTranslationOptionHandler !== "function") {
        this.options.overloadTranslationOptionHandler = defOpts.overloadTranslationOptionHandler;
      }
      const createClassOnDemand = (ClassOrObject) => {
        if (!ClassOrObject) return null;
        if (typeof ClassOrObject === "function") return new ClassOrObject();
        return ClassOrObject;
      };
      if (!this.options.isClone) {
        if (this.modules.logger) {
          baseLogger.init(createClassOnDemand(this.modules.logger), this.options);
        } else {
          baseLogger.init(null, this.options);
        }
        let formatter;
        if (this.modules.formatter) {
          formatter = this.modules.formatter;
        } else {
          formatter = Formatter;
        }
        const lu = new LanguageUtil(this.options);
        this.store = new ResourceStore(this.options.resources, this.options);
        const s = this.services;
        s.logger = baseLogger;
        s.resourceStore = this.store;
        s.languageUtils = lu;
        s.pluralResolver = new PluralResolver(lu, {
          prepend: this.options.pluralSeparator
        });
        if (formatter) {
          s.formatter = createClassOnDemand(formatter);
          if (s.formatter.init) s.formatter.init(s, this.options);
          this.options.interpolation.format = s.formatter.format.bind(s.formatter);
        }
        s.interpolator = new Interpolator(this.options);
        s.utils = {
          hasLoadedNamespace: this.hasLoadedNamespace.bind(this)
        };
        s.backendConnector = new Connector(createClassOnDemand(this.modules.backend), s.resourceStore, s, this.options);
        s.backendConnector.on("*", (event, ...args) => {
          this.emit(event, ...args);
        });
        if (this.modules.languageDetector) {
          s.languageDetector = createClassOnDemand(this.modules.languageDetector);
          if (s.languageDetector.init) s.languageDetector.init(s, this.options.detection, this.options);
        }
        if (this.modules.i18nFormat) {
          s.i18nFormat = createClassOnDemand(this.modules.i18nFormat);
          if (s.i18nFormat.init) s.i18nFormat.init(this);
        }
        this.translator = new Translator(this.services, this.options);
        this.translator.on("*", (event, ...args) => {
          this.emit(event, ...args);
        });
        this.modules.external.forEach((m) => {
          if (m.init) m.init(this);
        });
      }
      this.format = this.options.interpolation.format;
      if (!callback) callback = noop;
      if (this.options.fallbackLng && !this.services.languageDetector && !this.options.lng) {
        const codes = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);
        if (codes.length > 0 && codes[0] !== "dev") this.options.lng = codes[0];
      }
      if (!this.services.languageDetector && !this.options.lng) {
        this.logger.warn("init: no languageDetector is used and no lng is defined");
      }
      const storeApi = ["getResource", "hasResourceBundle", "getResourceBundle", "getDataByLanguage"];
      storeApi.forEach((fcName) => {
        this[fcName] = (...args) => this.store[fcName](...args);
      });
      const storeApiChained = ["addResource", "addResources", "addResourceBundle", "removeResourceBundle"];
      storeApiChained.forEach((fcName) => {
        this[fcName] = (...args) => {
          this.store[fcName](...args);
          return this;
        };
      });
      const deferred = defer();
      const load = () => {
        const finish = (err, t2) => {
          this.isInitializing = false;
          if (this.isInitialized && !this.initializedStoreOnce) this.logger.warn("init: i18next is already initialized. You should call init just once!");
          this.isInitialized = true;
          if (!this.options.isClone) this.logger.log("initialized", this.options);
          this.emit("initialized", this.options);
          deferred.resolve(t2);
          callback(err, t2);
        };
        if ((this.languages || this.isLanguageChangingTo) && !this.isInitialized) return finish(null, this.t.bind(this));
        this.changeLanguage(this.options.lng, finish);
      };
      if (this.options.resources || !this.options.initAsync) {
        load();
      } else {
        setTimeout(load, 0);
      }
      return deferred;
    }
    loadResources(language, callback = noop) {
      let usedCallback = callback;
      const usedLng = isString(language) ? language : this.language;
      if (typeof language === "function") usedCallback = language;
      if (!this.options.resources || this.options.partialBundledLanguages) {
        if (usedLng?.toLowerCase() === "cimode" && (!this.options.preload || this.options.preload.length === 0)) return usedCallback();
        const toLoad = [];
        const append = (lng) => {
          if (!lng) return;
          if (lng === "cimode") return;
          const lngs = this.services.languageUtils.toResolveHierarchy(lng);
          lngs.forEach((l) => {
            if (l === "cimode") return;
            if (!toLoad.includes(l)) toLoad.push(l);
          });
        };
        if (!usedLng) {
          const fallbacks = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);
          fallbacks.forEach((l) => append(l));
        } else {
          append(usedLng);
        }
        this.options.preload?.forEach?.((l) => append(l));
        this.services.backendConnector.load(toLoad, this.options.ns, (e) => {
          if (!e && !this.resolvedLanguage && this.language) this.setResolvedLanguage(this.language);
          usedCallback(e);
        });
      } else {
        usedCallback(null);
      }
    }
    reloadResources(lngs, ns, callback) {
      const deferred = defer();
      if (typeof lngs === "function") {
        callback = lngs;
        lngs = void 0;
      }
      if (typeof ns === "function") {
        callback = ns;
        ns = void 0;
      }
      if (!lngs) lngs = this.languages;
      if (!ns) ns = this.options.ns;
      if (!callback) callback = noop;
      this.services.backendConnector.reload(lngs, ns, (err) => {
        deferred.resolve();
        callback(err);
      });
      return deferred;
    }
    use(module) {
      if (!module) throw new Error("You are passing an undefined module! Please check the object you are passing to i18next.use()");
      if (!module.type) throw new Error("You are passing a wrong module! Please check the object you are passing to i18next.use()");
      if (module.type === "backend") {
        this.modules.backend = module;
      }
      if (module.type === "logger" || module.log && module.warn && module.error) {
        this.modules.logger = module;
      }
      if (module.type === "languageDetector") {
        this.modules.languageDetector = module;
      }
      if (module.type === "i18nFormat") {
        this.modules.i18nFormat = module;
      }
      if (module.type === "postProcessor") {
        postProcessor.addPostProcessor(module);
      }
      if (module.type === "formatter") {
        this.modules.formatter = module;
      }
      if (module.type === "3rdParty") {
        this.modules.external.push(module);
      }
      return this;
    }
    setResolvedLanguage(l) {
      if (!l || !this.languages) return;
      if (["cimode", "dev"].includes(l)) return;
      for (let li = 0; li < this.languages.length; li++) {
        const lngInLngs = this.languages[li];
        if (["cimode", "dev"].includes(lngInLngs)) continue;
        if (this.store.hasLanguageSomeTranslations(lngInLngs)) {
          this.resolvedLanguage = lngInLngs;
          break;
        }
      }
      if (!this.resolvedLanguage && !this.languages.includes(l) && this.store.hasLanguageSomeTranslations(l)) {
        this.resolvedLanguage = l;
        this.languages.unshift(l);
      }
    }
    changeLanguage(lng, callback) {
      this.isLanguageChangingTo = lng;
      const deferred = defer();
      this.emit("languageChanging", lng);
      const setLngProps = (l) => {
        this.language = l;
        this.languages = this.services.languageUtils.toResolveHierarchy(l);
        this.resolvedLanguage = void 0;
        this.setResolvedLanguage(l);
      };
      const done = (err, l) => {
        if (l) {
          if (this.isLanguageChangingTo === lng) {
            setLngProps(l);
            this.translator.changeLanguage(l);
            this.isLanguageChangingTo = void 0;
            this.emit("languageChanged", l);
            this.logger.log("languageChanged", l);
          }
        } else {
          this.isLanguageChangingTo = void 0;
        }
        deferred.resolve((...args) => this.t(...args));
        if (callback) callback(err, (...args) => this.t(...args));
      };
      const setLng = (lngs) => {
        if (!lng && !lngs && this.services.languageDetector) lngs = [];
        const fl = isString(lngs) ? lngs : lngs && lngs[0];
        const l = this.store.hasLanguageSomeTranslations(fl) ? fl : this.services.languageUtils.getBestMatchFromCodes(isString(lngs) ? [lngs] : lngs);
        if (l) {
          if (!this.language) {
            setLngProps(l);
          }
          if (!this.translator.language) this.translator.changeLanguage(l);
          this.services.languageDetector?.cacheUserLanguage?.(l);
        }
        this.loadResources(l, (err) => {
          done(err, l);
        });
      };
      if (!lng && this.services.languageDetector && !this.services.languageDetector.async) {
        setLng(this.services.languageDetector.detect());
      } else if (!lng && this.services.languageDetector && this.services.languageDetector.async) {
        if (this.services.languageDetector.detect.length === 0) {
          this.services.languageDetector.detect().then(setLng);
        } else {
          this.services.languageDetector.detect(setLng);
        }
      } else {
        setLng(lng);
      }
      return deferred;
    }
    getFixedT(lng, ns, keyPrefix, fixedOpts) {
      const scopeNs = fixedOpts?.scopeNs;
      const fixedT = (key, opts, ...rest) => {
        let o;
        if (typeof opts !== "object") {
          o = this.options.overloadTranslationOptionHandler([key, opts].concat(rest));
        } else {
          o = {
            ...opts
          };
        }
        o.lng = o.lng || fixedT.lng;
        o.lngs = o.lngs || fixedT.lngs;
        const explicitCallNs = o.ns !== void 0 && o.ns !== null;
        o.ns = o.ns || fixedT.ns;
        if (o.keyPrefix !== "") o.keyPrefix = o.keyPrefix || keyPrefix || fixedT.keyPrefix;
        const selectorOpts = {
          ...this.options,
          ...o
        };
        if (Array.isArray(scopeNs) && !explicitCallNs) selectorOpts.ns = scopeNs;
        if (typeof o.keyPrefix === "function") o.keyPrefix = keysFromSelector(o.keyPrefix, selectorOpts);
        const keySeparator = this.options.keySeparator || ".";
        let resultKey;
        if (o.keyPrefix && Array.isArray(key)) {
          resultKey = key.map((k) => {
            if (typeof k === "function") k = keysFromSelector(k, selectorOpts);
            return `${o.keyPrefix}${keySeparator}${k}`;
          });
        } else {
          if (typeof key === "function") key = keysFromSelector(key, selectorOpts);
          resultKey = o.keyPrefix ? `${o.keyPrefix}${keySeparator}${key}` : key;
        }
        return this.t(resultKey, o);
      };
      if (isString(lng)) {
        fixedT.lng = lng;
      } else {
        fixedT.lngs = lng;
      }
      fixedT.ns = ns;
      fixedT.keyPrefix = keyPrefix;
      return fixedT;
    }
    t(...args) {
      return this.translator?.translate(...args);
    }
    exists(...args) {
      return this.translator?.exists(...args);
    }
    setDefaultNamespace(ns) {
      this.options.defaultNS = ns;
    }
    hasLoadedNamespace(ns, options = {}) {
      if (!this.isInitialized) {
        this.logger.warn("hasLoadedNamespace: i18next was not initialized", this.languages);
        return false;
      }
      if (!this.languages || !this.languages.length) {
        this.logger.warn("hasLoadedNamespace: i18n.languages were undefined or empty", this.languages);
        return false;
      }
      const lng = options.lng || this.resolvedLanguage || this.languages[0];
      const fallbackLng = this.options ? this.options.fallbackLng : false;
      const lastLng = this.languages[this.languages.length - 1];
      if (lng.toLowerCase() === "cimode") return true;
      const loadNotPending = (l, n) => {
        const loadState = this.services.backendConnector.state[`${l}|${n}`];
        return loadState === -1 || loadState === 0 || loadState === 2;
      };
      if (options.precheck) {
        const preResult = options.precheck(this, loadNotPending);
        if (preResult !== void 0) return preResult;
      }
      if (this.hasResourceBundle(lng, ns)) return true;
      if (!this.services.backendConnector.backend || this.options.resources && !this.options.partialBundledLanguages) return true;
      if (loadNotPending(lng, ns) && (!fallbackLng || loadNotPending(lastLng, ns))) return true;
      return false;
    }
    loadNamespaces(ns, callback) {
      const deferred = defer();
      if (!this.options.ns) {
        if (callback) callback();
        return Promise.resolve();
      }
      if (isString(ns)) ns = [ns];
      ns.forEach((n) => {
        if (!this.options.ns.includes(n)) this.options.ns.push(n);
      });
      this.loadResources((err) => {
        deferred.resolve();
        if (callback) callback(err);
      });
      return deferred;
    }
    loadLanguages(lngs, callback) {
      const deferred = defer();
      if (isString(lngs)) lngs = [lngs];
      const preloaded = this.options.preload || [];
      const newLngs = lngs.filter((lng) => !preloaded.includes(lng) && this.services.languageUtils.isSupportedCode(lng));
      if (!newLngs.length) {
        if (callback) callback();
        return Promise.resolve();
      }
      this.options.preload = preloaded.concat(newLngs);
      this.loadResources((err) => {
        deferred.resolve();
        if (callback) callback(err);
      });
      return deferred;
    }
    dir(lng) {
      if (!lng) lng = this.resolvedLanguage || (this.languages?.length > 0 ? this.languages[0] : this.language);
      if (!lng) return "rtl";
      try {
        const l = new Intl.Locale(lng);
        if (l && l.getTextInfo) {
          const ti = l.getTextInfo();
          if (ti && ti.direction) return ti.direction;
        }
      } catch (e) {
      }
      const rtlLngs = ["ar", "shu", "sqr", "ssh", "xaa", "yhd", "yud", "aao", "abh", "abv", "acm", "acq", "acw", "acx", "acy", "adf", "ads", "aeb", "aec", "afb", "ajp", "apc", "apd", "arb", "arq", "ars", "ary", "arz", "auz", "avl", "ayh", "ayl", "ayn", "ayp", "bbz", "pga", "he", "iw", "ps", "pbt", "pbu", "pst", "prp", "prd", "ug", "ur", "ydd", "yds", "yih", "ji", "yi", "hbo", "men", "xmn", "fa", "jpr", "peo", "pes", "prs", "dv", "sam", "ckb"];
      const languageUtils = this.services?.languageUtils || new LanguageUtil(get());
      if (lng.toLowerCase().indexOf("-latn") > 1) return "ltr";
      return rtlLngs.includes(languageUtils.getLanguagePartFromCode(lng)) || lng.toLowerCase().indexOf("-arab") > 1 ? "rtl" : "ltr";
    }
    static createInstance(options = {}, callback) {
      const instance2 = new _I18n(options, callback);
      instance2.createInstance = _I18n.createInstance;
      return instance2;
    }
    cloneInstance(options = {}, callback = noop) {
      const forkResourceStore = options.forkResourceStore;
      if (forkResourceStore) delete options.forkResourceStore;
      const mergedOptions = {
        ...this.options,
        ...options,
        ...{
          isClone: true
        }
      };
      const clone = new _I18n(mergedOptions);
      if (options.debug !== void 0 || options.prefix !== void 0) {
        clone.logger = clone.logger.clone(options);
      }
      const membersToCopy = ["store", "services", "language"];
      membersToCopy.forEach((m) => {
        clone[m] = this[m];
      });
      clone.services = {
        ...this.services
      };
      clone.services.utils = {
        hasLoadedNamespace: clone.hasLoadedNamespace.bind(clone)
      };
      if (forkResourceStore) {
        const clonedData = Object.keys(this.store.data).reduce((prev, l) => {
          prev[l] = {
            ...this.store.data[l]
          };
          prev[l] = Object.keys(prev[l]).reduce((acc, n) => {
            acc[n] = {
              ...prev[l][n]
            };
            return acc;
          }, prev[l]);
          return prev;
        }, {});
        clone.store = new ResourceStore(clonedData, mergedOptions);
        clone.services.resourceStore = clone.store;
      }
      if (options.interpolation) {
        const defOpts = get();
        const mergedInterpolation = {
          ...defOpts.interpolation,
          ...this.options.interpolation,
          ...options.interpolation
        };
        const mergedForInterpolator = {
          ...mergedOptions,
          interpolation: mergedInterpolation
        };
        clone.services.interpolator = new Interpolator(mergedForInterpolator);
      }
      clone.translator = new Translator(clone.services, mergedOptions);
      clone.translator.on("*", (event, ...args) => {
        clone.emit(event, ...args);
      });
      clone.init(mergedOptions, callback);
      clone.translator.options = mergedOptions;
      clone.translator.backendConnector.services.utils = {
        hasLoadedNamespace: clone.hasLoadedNamespace.bind(clone)
      };
      return clone;
    }
    toJSON() {
      return {
        options: this.options,
        store: this.store,
        language: this.language,
        languages: this.languages,
        resolvedLanguage: this.resolvedLanguage
      };
    }
  };
  var instance = I18n.createInstance();
  var createInstance = instance.createInstance;
  var dir = instance.dir;
  var init = instance.init;
  var loadResources = instance.loadResources;
  var reloadResources = instance.reloadResources;
  var use = instance.use;
  var changeLanguage = instance.changeLanguage;
  var getFixedT = instance.getFixedT;
  var t = instance.t;
  var exists = instance.exists;
  var setDefaultNamespace = instance.setDefaultNamespace;
  var hasLoadedNamespace = instance.hasLoadedNamespace;
  var loadNamespaces = instance.loadNamespaces;
  var loadLanguages = instance.loadLanguages;

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/Trans.js
  var import_react3 = __toESM(require_react(), 1);

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/TransWithoutContext.js
  var import_react = __toESM(require_react(), 1);

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/utils.js
  var warn = (i18n, code, msg, rest) => {
    const args = [msg, {
      code,
      ...rest || {}
    }];
    if (i18n?.services?.logger?.forward) {
      return i18n.services.logger.forward(args, "warn", "react-i18next::", true);
    }
    if (isString2(args[0])) args[0] = `react-i18next:: ${args[0]}`;
    if (i18n?.services?.logger?.warn) {
      i18n.services.logger.warn(...args);
    } else if (console?.warn) {
      console.warn(...args);
    }
  };
  var alreadyWarned = {};
  var warnOnce = (i18n, code, msg, rest) => {
    if (isString2(msg) && alreadyWarned[msg]) return;
    if (isString2(msg)) alreadyWarned[msg] = /* @__PURE__ */ new Date();
    warn(i18n, code, msg, rest);
  };
  var isString2 = (obj) => typeof obj === "string";

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/unescape.js
  var matchHtmlEntity = /&(?:amp|#38|lt|#60|gt|#62|apos|#39|quot|#34|nbsp|#160|copy|#169|reg|#174|hellip|#8230|#x2F|#47);/g;
  var htmlEntities = {
    "&amp;": "&",
    "&#38;": "&",
    "&lt;": "<",
    "&#60;": "<",
    "&gt;": ">",
    "&#62;": ">",
    "&apos;": "'",
    "&#39;": "'",
    "&quot;": '"',
    "&#34;": '"',
    "&nbsp;": " ",
    "&#160;": " ",
    "&copy;": "\xA9",
    "&#169;": "\xA9",
    "&reg;": "\xAE",
    "&#174;": "\xAE",
    "&hellip;": "\u2026",
    "&#8230;": "\u2026",
    "&#x2F;": "/",
    "&#47;": "/"
  };
  var unescapeHtmlEntity = (m) => htmlEntities[m];
  var unescape = (text) => text.replace(matchHtmlEntity, unescapeHtmlEntity);

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/defaults.js
  var defaultOptions = {
    bindI18n: "languageChanged",
    bindI18nStore: "",
    transEmptyNodeValue: "",
    transSupportBasicHtmlNodes: true,
    transWrapTextNodes: "",
    transKeepBasicHtmlNodesFor: ["br", "strong", "i", "p"],
    useSuspense: true,
    unescape,
    transDefaultProps: void 0
  };
  var setDefaults = (options = {}) => {
    defaultOptions = {
      ...defaultOptions,
      ...options
    };
  };

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/i18nInstance.js
  var i18nInstance;
  var setI18n = (instance2) => {
    i18nInstance = instance2;
  };
  var getI18n = () => i18nInstance;

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/context.js
  var import_react2 = __toESM(require_react(), 1);

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/initReactI18next.js
  var initReactI18next = {
    type: "3rdParty",
    init(instance2) {
      setDefaults(instance2.options.react);
      setI18n(instance2);
    }
  };

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/context.js
  var I18nContext = (0, import_react2.createContext)();

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/IcuTrans.js
  var import_react6 = __toESM(require_react(), 1);

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/IcuTransWithoutContext.js
  var import_react5 = __toESM(require_react(), 1);

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/IcuTransUtils/TranslationParserError.js
  var TranslationParserError = class _TranslationParserError extends Error {
    constructor(message, position, translationString) {
      super(message);
      this.name = "TranslationParserError";
      this.position = position;
      this.translationString = translationString;
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, _TranslationParserError);
      }
    }
  };

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/IcuTransUtils/htmlEntityDecoder.js
  var commonEntities = {
    "&nbsp;": "\xA0",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
    "&copy;": "\xA9",
    "&reg;": "\xAE",
    "&trade;": "\u2122",
    "&hellip;": "\u2026",
    "&ndash;": "\u2013",
    "&mdash;": "\u2014",
    "&lsquo;": "\u2018",
    "&rsquo;": "\u2019",
    "&sbquo;": "\u201A",
    "&ldquo;": "\u201C",
    "&rdquo;": "\u201D",
    "&bdquo;": "\u201E",
    "&dagger;": "\u2020",
    "&Dagger;": "\u2021",
    "&bull;": "\u2022",
    "&prime;": "\u2032",
    "&Prime;": "\u2033",
    "&lsaquo;": "\u2039",
    "&rsaquo;": "\u203A",
    "&sect;": "\xA7",
    "&para;": "\xB6",
    "&middot;": "\xB7",
    "&ensp;": "\u2002",
    "&emsp;": "\u2003",
    "&thinsp;": "\u2009",
    "&euro;": "\u20AC",
    "&pound;": "\xA3",
    "&yen;": "\xA5",
    "&cent;": "\xA2",
    "&curren;": "\xA4",
    "&times;": "\xD7",
    "&divide;": "\xF7",
    "&minus;": "\u2212",
    "&plusmn;": "\xB1",
    "&ne;": "\u2260",
    "&le;": "\u2264",
    "&ge;": "\u2265",
    "&asymp;": "\u2248",
    "&equiv;": "\u2261",
    "&infin;": "\u221E",
    "&int;": "\u222B",
    "&sum;": "\u2211",
    "&prod;": "\u220F",
    "&radic;": "\u221A",
    "&part;": "\u2202",
    "&permil;": "\u2030",
    "&deg;": "\xB0",
    "&micro;": "\xB5",
    "&larr;": "\u2190",
    "&uarr;": "\u2191",
    "&rarr;": "\u2192",
    "&darr;": "\u2193",
    "&harr;": "\u2194",
    "&crarr;": "\u21B5",
    "&lArr;": "\u21D0",
    "&uArr;": "\u21D1",
    "&rArr;": "\u21D2",
    "&dArr;": "\u21D3",
    "&hArr;": "\u21D4",
    "&alpha;": "\u03B1",
    "&beta;": "\u03B2",
    "&gamma;": "\u03B3",
    "&delta;": "\u03B4",
    "&epsilon;": "\u03B5",
    "&zeta;": "\u03B6",
    "&eta;": "\u03B7",
    "&theta;": "\u03B8",
    "&iota;": "\u03B9",
    "&kappa;": "\u03BA",
    "&lambda;": "\u03BB",
    "&mu;": "\u03BC",
    "&nu;": "\u03BD",
    "&xi;": "\u03BE",
    "&omicron;": "\u03BF",
    "&pi;": "\u03C0",
    "&rho;": "\u03C1",
    "&sigma;": "\u03C3",
    "&tau;": "\u03C4",
    "&upsilon;": "\u03C5",
    "&phi;": "\u03C6",
    "&chi;": "\u03C7",
    "&psi;": "\u03C8",
    "&omega;": "\u03C9",
    "&Alpha;": "\u0391",
    "&Beta;": "\u0392",
    "&Gamma;": "\u0393",
    "&Delta;": "\u0394",
    "&Epsilon;": "\u0395",
    "&Zeta;": "\u0396",
    "&Eta;": "\u0397",
    "&Theta;": "\u0398",
    "&Iota;": "\u0399",
    "&Kappa;": "\u039A",
    "&Lambda;": "\u039B",
    "&Mu;": "\u039C",
    "&Nu;": "\u039D",
    "&Xi;": "\u039E",
    "&Omicron;": "\u039F",
    "&Pi;": "\u03A0",
    "&Rho;": "\u03A1",
    "&Sigma;": "\u03A3",
    "&Tau;": "\u03A4",
    "&Upsilon;": "\u03A5",
    "&Phi;": "\u03A6",
    "&Chi;": "\u03A7",
    "&Psi;": "\u03A8",
    "&Omega;": "\u03A9",
    "&Agrave;": "\xC0",
    "&Aacute;": "\xC1",
    "&Acirc;": "\xC2",
    "&Atilde;": "\xC3",
    "&Auml;": "\xC4",
    "&Aring;": "\xC5",
    "&AElig;": "\xC6",
    "&Ccedil;": "\xC7",
    "&Egrave;": "\xC8",
    "&Eacute;": "\xC9",
    "&Ecirc;": "\xCA",
    "&Euml;": "\xCB",
    "&Igrave;": "\xCC",
    "&Iacute;": "\xCD",
    "&Icirc;": "\xCE",
    "&Iuml;": "\xCF",
    "&ETH;": "\xD0",
    "&Ntilde;": "\xD1",
    "&Ograve;": "\xD2",
    "&Oacute;": "\xD3",
    "&Ocirc;": "\xD4",
    "&Otilde;": "\xD5",
    "&Ouml;": "\xD6",
    "&Oslash;": "\xD8",
    "&Ugrave;": "\xD9",
    "&Uacute;": "\xDA",
    "&Ucirc;": "\xDB",
    "&Uuml;": "\xDC",
    "&Yacute;": "\xDD",
    "&THORN;": "\xDE",
    "&szlig;": "\xDF",
    "&agrave;": "\xE0",
    "&aacute;": "\xE1",
    "&acirc;": "\xE2",
    "&atilde;": "\xE3",
    "&auml;": "\xE4",
    "&aring;": "\xE5",
    "&aelig;": "\xE6",
    "&ccedil;": "\xE7",
    "&egrave;": "\xE8",
    "&eacute;": "\xE9",
    "&ecirc;": "\xEA",
    "&euml;": "\xEB",
    "&igrave;": "\xEC",
    "&iacute;": "\xED",
    "&icirc;": "\xEE",
    "&iuml;": "\xEF",
    "&eth;": "\xF0",
    "&ntilde;": "\xF1",
    "&ograve;": "\xF2",
    "&oacute;": "\xF3",
    "&ocirc;": "\xF4",
    "&otilde;": "\xF5",
    "&ouml;": "\xF6",
    "&oslash;": "\xF8",
    "&ugrave;": "\xF9",
    "&uacute;": "\xFA",
    "&ucirc;": "\xFB",
    "&uuml;": "\xFC",
    "&yacute;": "\xFD",
    "&thorn;": "\xFE",
    "&yuml;": "\xFF",
    "&iexcl;": "\xA1",
    "&iquest;": "\xBF",
    "&fnof;": "\u0192",
    "&circ;": "\u02C6",
    "&tilde;": "\u02DC",
    "&OElig;": "\u0152",
    "&oelig;": "\u0153",
    "&Scaron;": "\u0160",
    "&scaron;": "\u0161",
    "&Yuml;": "\u0178",
    "&ordf;": "\xAA",
    "&ordm;": "\xBA",
    "&macr;": "\xAF",
    "&acute;": "\xB4",
    "&cedil;": "\xB8",
    "&sup1;": "\xB9",
    "&sup2;": "\xB2",
    "&sup3;": "\xB3",
    "&frac14;": "\xBC",
    "&frac12;": "\xBD",
    "&frac34;": "\xBE",
    "&spades;": "\u2660",
    "&clubs;": "\u2663",
    "&hearts;": "\u2665",
    "&diams;": "\u2666",
    "&loz;": "\u25CA",
    "&oline;": "\u203E",
    "&frasl;": "\u2044",
    "&weierp;": "\u2118",
    "&image;": "\u2111",
    "&real;": "\u211C",
    "&alefsym;": "\u2135"
  };
  var entityPattern = new RegExp(Object.keys(commonEntities).map((entity) => entity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
  var decodeHtmlEntities = (text) => text.replace(entityPattern, (match) => commonEntities[match]).replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10))).replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/IcuTransUtils/tokenizer.js
  var tokenize = (translation) => {
    const tokens = [];
    let position = 0;
    let currentText = "";
    const flushText = () => {
      if (currentText) {
        tokens.push({
          type: "Text",
          value: currentText,
          position: position - currentText.length
        });
        currentText = "";
      }
    };
    while (position < translation.length) {
      const char = translation[position];
      if (char === "<") {
        const tagMatch = translation.slice(position).match(/^<(\d+)>/);
        if (tagMatch) {
          flushText();
          tokens.push({
            type: "TagOpen",
            value: tagMatch[0],
            position,
            tagNumber: parseInt(tagMatch[1], 10)
          });
          position += tagMatch[0].length;
        } else {
          const closeTagMatch = translation.slice(position).match(/^<\/(\d+)>/);
          if (closeTagMatch) {
            flushText();
            tokens.push({
              type: "TagClose",
              value: closeTagMatch[0],
              position,
              tagNumber: parseInt(closeTagMatch[1], 10)
            });
            position += closeTagMatch[0].length;
          } else {
            currentText += char;
            position += 1;
          }
        }
      } else {
        currentText += char;
        position += 1;
      }
    }
    flushText();
    return tokens;
  };

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/IcuTransUtils/renderTranslation.js
  var import_react4 = __toESM(require_react(), 1);
  var renderDeclarationNode = (declaration, children, childDeclarations) => {
    const {
      type,
      props = {}
    } = declaration;
    if (props.children && Array.isArray(props.children) && childDeclarations) {
      const {
        children: _childrenToRemove,
        ...propsWithoutChildren
      } = props;
      return import_react4.default.createElement(type, propsWithoutChildren, ...children);
    }
    if (children.length === 0) {
      return import_react4.default.createElement(type, props);
    }
    if (children.length === 1) {
      return import_react4.default.createElement(type, props, children[0]);
    }
    return import_react4.default.createElement(type, props, ...children);
  };
  var renderTranslation = (translation, declarations = []) => {
    if (!translation) {
      return [];
    }
    const tokens = tokenize(translation);
    const result = [];
    const stack = [];
    const literalTagNumbers = /* @__PURE__ */ new Set();
    const getCurrentDeclarations = () => {
      if (stack.length === 0) {
        return declarations;
      }
      const parentFrame = stack[stack.length - 1];
      if (parentFrame.declaration.props?.children && Array.isArray(parentFrame.declaration.props.children)) {
        return parentFrame.declaration.props.children;
      }
      return parentFrame.declarations;
    };
    tokens.forEach((token) => {
      switch (token.type) {
        case "Text":
          {
            const decoded = decodeHtmlEntities(token.value);
            const targetArray = stack.length > 0 ? stack[stack.length - 1].children : result;
            targetArray.push(decoded);
          }
          break;
        case "TagOpen":
          {
            const {
              tagNumber
            } = token;
            const currentDeclarations = getCurrentDeclarations();
            const declaration = currentDeclarations[tagNumber];
            if (!declaration) {
              literalTagNumbers.add(tagNumber);
              const literalText = `<${tagNumber}>`;
              const targetArray = stack.length > 0 ? stack[stack.length - 1].children : result;
              targetArray.push(literalText);
              break;
            }
            stack.push({
              tagNumber,
              children: [],
              position: token.position,
              declaration,
              declarations: currentDeclarations
            });
          }
          break;
        case "TagClose":
          {
            const {
              tagNumber
            } = token;
            if (literalTagNumbers.has(tagNumber)) {
              const literalText = `</${tagNumber}>`;
              const literalTargetArray = stack.length > 0 ? stack[stack.length - 1].children : result;
              literalTargetArray.push(literalText);
              literalTagNumbers.delete(tagNumber);
              break;
            }
            if (stack.length === 0) {
              throw new TranslationParserError(`Unexpected closing tag </${tagNumber}> at position ${token.position}`, token.position, translation);
            }
            const frame = stack.pop();
            if (frame.tagNumber !== tagNumber) {
              throw new TranslationParserError(`Mismatched tags: expected </${frame.tagNumber}> but got </${tagNumber}> at position ${token.position}`, token.position, translation);
            }
            const element = renderDeclarationNode(frame.declaration, frame.children, frame.declarations);
            const elementTargetArray = stack.length > 0 ? stack[stack.length - 1].children : result;
            elementTargetArray.push(element);
          }
          break;
      }
    });
    if (stack.length > 0) {
      const unclosed = stack[stack.length - 1];
      throw new TranslationParserError(`Unclosed tag <${unclosed.tagNumber}> at position ${unclosed.position}`, unclosed.position, translation);
    }
    return result;
  };

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/IcuTransWithoutContext.js
  function IcuTransWithoutContext({
    i18nKey,
    defaultTranslation,
    content,
    ns,
    values = {},
    i18n: i18nFromProps,
    t: tFromProps
  }) {
    const i18n = i18nFromProps || getI18n();
    if (!i18n) {
      warnOnce(i18n, "NO_I18NEXT_INSTANCE", `IcuTrans: You need to pass in an i18next instance using i18nextReactModule`, {
        i18nKey
      });
      return import_react5.default.createElement(import_react5.default.Fragment, {}, defaultTranslation);
    }
    const t2 = tFromProps || i18n.t?.bind(i18n) || ((k) => k);
    let namespaces = ns || t2.ns || i18n.options?.defaultNS;
    namespaces = isString2(namespaces) ? [namespaces] : namespaces || ["translation"];
    let mergedValues = values;
    if (i18n.options?.interpolation?.defaultVariables) {
      mergedValues = values && Object.keys(values).length > 0 ? {
        ...values,
        ...i18n.options.interpolation.defaultVariables
      } : {
        ...i18n.options.interpolation.defaultVariables
      };
    }
    const translation = t2(i18nKey || defaultTranslation, {
      defaultValue: defaultTranslation,
      ...mergedValues,
      ns: namespaces
    });
    try {
      const rendered = renderTranslation(translation, content);
      return import_react5.default.createElement(import_react5.default.Fragment, {}, ...rendered);
    } catch (error) {
      warn(i18n, "ICU_TRANS_RENDER_ERROR", `IcuTrans component error for key "${i18nKey}": ${error.message}`, {
        i18nKey,
        error
      });
      return import_react5.default.createElement(import_react5.default.Fragment, {}, translation);
    }
  }
  IcuTransWithoutContext.displayName = "IcuTransWithoutContext";

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/IcuTrans.js
  function IcuTrans({
    i18nKey,
    defaultTranslation,
    content,
    ns,
    values = {},
    i18n: i18nFromProps,
    t: tFromProps
  }) {
    const {
      i18n: i18nFromContext,
      defaultNS: defaultNSFromContext
    } = (0, import_react6.useContext)(I18nContext) || {};
    const i18n = i18nFromProps || i18nFromContext || getI18n();
    const t2 = tFromProps || i18n?.t.bind(i18n);
    return IcuTransWithoutContext({
      i18nKey,
      defaultTranslation,
      content,
      ns: ns || t2?.ns || defaultNSFromContext || i18n?.options?.defaultNS,
      values,
      i18n,
      t: tFromProps
    });
  }
  IcuTrans.displayName = "IcuTrans";

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/useTranslation.js
  var import_react7 = __toESM(require_react(), 1);
  var import_shim = __toESM(require_shim(), 1);

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/withTranslation.js
  var import_react8 = __toESM(require_react(), 1);

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/I18nextProvider.js
  var import_react9 = __toESM(require_react(), 1);

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/withSSR.js
  var import_react11 = __toESM(require_react(), 1);

  // node_modules/.pnpm/react-i18next@17.0.15_i18next@26.4.2_typescript@7.0.2__react-dom@19.3.0_react@19.3.0__react@19.3.0_typescript@7.0.2/node_modules/react-i18next/dist/es/useSSR.js
  var import_react10 = __toESM(require_react(), 1);

  // apps/frontend/src/i18n/catalog.ts
  var BREAK_HINT = "<wbr/>";
  var isLeaf = (value) => typeof value.en === "string";
  var resourcesIn = (catalog, language) => {
    const resources = {};
    for (const [key, value] of Object.entries(catalog)) {
      if (isLeaf(value)) {
        const text = value[language];
        if (text !== void 0) resources[key] = text;
      } else {
        const group = resourcesIn(value, language);
        if (Object.keys(group).length) resources[key] = group;
      }
    }
    return resources;
  };

  // apps/frontend/src/i18n/language.ts
  var CHOSEN = "draw.language";
  function readChosenLanguage() {
    if (typeof localStorage === "undefined") return null;
    try {
      const stored = localStorage.getItem(CHOSEN);
      return stored === "en" || stored === "ja" ? stored : null;
    } catch (error) {
      console.error("The chosen language couldn't be read", error);
      return null;
    }
  }

  // apps/frontend/src/i18n/strings/api.ts
  var api = {
    /** The screen that holds the app while it signs in to the app's server, and says why it couldn't. */
    signIn: {
      /** Sign-in screen, right after the LINE sign-in screen while the app signs in to its server with LINE's ID token: the status line */
      opening: { en: "Opening your sticker board\u2026", ja: "\u30B7\u30FC\u30EB\u30DC\u30FC\u30C9\u3092\u3072\u3089\u3044\u3066\u3044\u307E\u3059\u2026" },
      /** Sign-in screen, once signing in to the app's server has taken about six seconds: the line that joins the status line to say the wait is long */
      stillOpening: {
        en: "Still opening. It\u2019s taking longer than usual.",
        ja: "\u307E\u3060\u3072\u3089\u3044\u3066\u3044\u307E\u3059\u3002<wbr/>\u3044\u3064\u3082\u3088\u308A<wbr/>\u6642\u9593\u304C<wbr/>\u304B\u304B\u3063\u3066\u3044\u307E\u3059\u3002"
      },
      /** Sign-in screen, when signing in to the app's server fails: the heading above the error's message and a Try again or Reconnect with LINE button */
      failed: { en: "Couldn\u2019t sign you in", ja: "\u30ED\u30B0\u30A4\u30F3\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F" },
      /** Sign-in screen, after signing in to the app's server failed for a reason other than LINE's sign-in: the button that retries it */
      tryAgain: { en: "Try again", ja: "\u3082\u3046\u4E00\u5EA6" },
      /** Session-expiry screen, after a ready account loses its session: the heading above Reload */
      sessionEnded: { en: "Your session ended", ja: "\u30ED\u30B0\u30A4\u30F3\u306E\u6709\u52B9\u671F\u9650\u304C\u5207\u308C\u307E\u3057\u305F" },
      /** Session-expiry screen, after a ready account loses its session: explains the explicit Reload action */
      sessionExpired: {
        en: "Reload to continue. Your saved gratitude stays with its account.",
        ja: "\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u3066\u7D9A\u3051\u3066\u304F\u3060\u3055\u3044\u3002\u4FDD\u5B58\u3055\u308C\u305F\u611F\u8B1D\u306F\u3001\u5143\u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u306B\u6B8B\u308A\u307E\u3059\u3002"
      },
      /** Sign-in screen, after an established session ends or another tab changes accounts: explicitly reloads the page */
      reload: { en: "Reload", ja: "\u518D\u8AAD\u307F\u8FBC\u307F" },
      /** Sign-in screen, when LINE's sign-in token was missing, refused or expired: the button that restarts LINE Login */
      reconnect: { en: "Reconnect with LINE", ja: "LINE\u3067\u518D\u30ED\u30B0\u30A4\u30F3" },
      /** Sign-in screen, after tapping Reconnect with LINE: the status line while LINE Login restarts */
      reconnecting: { en: "Reconnecting with LINE\u2026", ja: "LINE\u3067\u518D\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u3044\u307E\u3059\u2026" }
    },
    /** Asks for a handle when your LINE name couldn't become one, before the app opens. */
    handle: {
      /** Handle prompt, on a first sign-in whose LINE name couldn't become the handle, before the app opens: the heading */
      title: { en: "Pick your handle", ja: "\u30E6\u30FC\u30B6\u30FC\u540D\u3092\u6C7A\u3081\u307E\u3057\u3087\u3046" },
      /** Handle prompt, when LINE gave no display name: the line under the heading */
      lead: {
        en: "It\u2019s how people find you and your stickers.",
        ja: "\u307F\u3093\u306A\u304C<wbr/>\u3042\u306A\u305F\u3084<wbr/>\u3042\u306A\u305F\u306E\u30B7\u30FC\u30EB\u3092<wbr/>\u898B\u3064\u3051\u308B\u3068\u304D\u306B<wbr/>\u4F7F\u3046\u540D\u524D\u3067\u3059\u3002"
      },
      /** Handle prompt, when the LINE display name ({{name}}) couldn't become the handle, because someone has it or it breaks the handle rules: the line under the heading */
      leadNameUnavailable: {
        en: "\u201C{{name}}\u201D isn\u2019t available as a handle, so choose your own. It\u2019s how people find you and your stickers.",
        ja: "\u300C{{name}}\u300D\u306F<wbr/>\u30E6\u30FC\u30B6\u30FC\u540D\u3068\u3057\u3066<wbr/>\u4F7F\u3048\u306A\u3044\u305F\u3081\u3001<wbr/>\u3042\u306A\u305F\u3060\u3051\u306E<wbr/>\u30E6\u30FC\u30B6\u30FC\u540D\u3092<wbr/>\u6C7A\u3081\u3066\u304F\u3060\u3055\u3044\u3002<wbr/>\u307F\u3093\u306A\u304C<wbr/>\u3042\u306A\u305F\u3084<wbr/>\u3042\u306A\u305F\u306E\u30B7\u30FC\u30EB\u3092<wbr/>\u898B\u3064\u3051\u308B\u3068\u304D\u306B<wbr/>\u4F7F\u3046\u540D\u524D\u3067\u3059\u3002"
      },
      /** Handle prompt: the handle input's accessible label, read by screen readers */
      field: { en: "Your handle", ja: "\u30E6\u30FC\u30B6\u30FC\u540D" },
      /** Handle prompt: the placeholder in the empty handle input, after the @ icon */
      placeholder: { en: "handle", ja: "\u30E6\u30FC\u30B6\u30FC\u540D" },
      /** Handle prompt, while typing: the problem line under the input once the handle is longer than {{max}} characters */
      tooLong: { en: "That\u2019s over {{max}} characters.", ja: "{{max}}\u6587\u5B57\u3092\u8D85\u3048\u3066\u3044\u307E\u3059\u3002" },
      /** Handle prompt, after tapping Use @handle: the problem line when the server answers handle_taken */
      taken: {
        en: "@{{handle}} is taken. Try another.",
        ja: "@{{handle}}\u306F\u3059\u3067\u306B\u4F7F\u308F\u308C\u3066\u3044\u307E\u3059\u3002\u5225\u306E\u30E6\u30FC\u30B6\u30FC\u540D\u3092\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
      },
      /** Handle prompt, after tapping Use @handle: the problem line when the server answers handle_invalid */
      invalid: {
        en: "A handle is 1 to {{max}} characters, without \u201C@\u201D or invisible characters.",
        ja: "\u30E6\u30FC\u30B6\u30FC\u540D\u306F\u300C@\u300D\u3084\u898B\u3048\u306A\u3044\u6587\u5B57\u306A\u3057\u306E1\u301C{{max}}\u6587\u5B57\u3067\u3059\u3002"
      },
      /** Handle prompt, after tapping Use @handle: the problem line when saving fails any other way; {{reason}} is problemOf's message */
      couldntSave: {
        en: "Couldn\u2019t save your handle: {{reason}}",
        ja: "\u30E6\u30FC\u30B6\u30FC\u540D\u3092\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
      },
      /** Handle prompt: the submit button once a handle is typed, naming it */
      use: { en: "Use @{{handle}}", ja: "@{{handle}}\u306B\u3059\u308B" },
      /** Handle prompt: the submit button, disabled, while the handle input is empty */
      pick: { en: "Pick a handle", ja: "\u30E6\u30FC\u30B6\u30FC\u540D\u3092\u6C7A\u3081\u308B" }
    },
    /** How screens name a person. */
    person: {
      /** Anywhere a person is named, for someone with neither a LINE name nor a handle, such as a deleted account: the name shown */
      unnamed: { en: "Someone", ja: "\u3060\u308C\u304B" }
    }
  };

  // apps/frontend/src/i18n/strings/app.ts
  var app = {
    /** Page title in LINE's header as the app opens, before a screen names itself: the app's name */
    title: { en: "Croquis", ja: "\u30AF\u30ED\u30C3\u30AD\u30FC" },
    /** Page title in LINE's header while the drawing screen is open; a tab's screen takes its tab's name */
    drawTitle: { en: "Draw", ja: "\u304B\u304F" },
    tabs: {
      /** Tab bar at the bottom of every screen but the drawing screen: its screen-reader name */
      sections: { en: "App sections", ja: "\u30A2\u30D7\u30EA\u306E\u30BB\u30AF\u30B7\u30E7\u30F3" },
      /** Tab bar at the bottom of every screen but the drawing screen: the tab for your own sticker board */
      myBoard: { en: "My board", ja: "\u30DE\u30A4\u30DC\u30FC\u30C9" },
      /** Tab bar at the bottom of every screen but the drawing screen: the tab for Explore, where you find other people's stickers and boards */
      explore: { en: "Explore", ja: "\u767A\u898B" },
      /** Tab bar on a large screen, while someone else's sticker board is open over Explore: screen readers' name for the lit Explore tab, which goes back to Explore */
      backToExplore: { en: "Back to Explore", ja: "\u767A\u898B\u306B\u623B\u308B" },
      /** Tab bar at the bottom of every screen but the drawing screen: the tab for the Shop, where tickets are bought */
      shop: { en: "Shop", ja: "\u30B7\u30E7\u30C3\u30D7" }
    },
    /** Drawing screen, when Draw is tapped before its code has loaded: what screen readers hear while it loads */
    drawingLoading: { en: "Opening the drawing screen", ja: "\u304B\u304F\u753B\u9762\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059" },
    upright: {
      /** Any screen, on a phone turned on its side: the one line on the cover over the app, until the phone is upright again */
      turn: { en: "Turn your phone upright", ja: "\u30B9\u30DE\u30DB\u3092\u7E26\u306B\u3057\u3066\u304F\u3060\u3055\u3044" }
    },
    crash: {
      /** The page that takes the app's place when a screen fails as it shows: its heading */
      title: { en: "Croquis stopped", ja: "\u30AF\u30ED\u30C3\u30AD\u30FC\u304C\u6B62\u307E\u308A\u307E\u3057\u305F" },
      /** The same page: the line under the heading, over the error's words */
      lead: {
        en: "Something on this screen went wrong. Reload to try again.",
        ja: "\u3053\u306E\u753B\u9762\u3067\u554F\u984C\u304C\u8D77\u304D\u307E\u3057\u305F\u3002\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u3066\u3001\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
      },
      /** The same page: the key that reloads the page */
      reload: { en: "Reload", ja: "\u518D\u8AAD\u307F\u8FBC\u307F" }
    },
    motionPermission: {
      /** Motion permission card, shown once over the app on iPhone and iPad: its screen-reader name */
      label: { en: "Motion permission", ja: "\u30E2\u30FC\u30B7\u30E7\u30F3\u306E\u8A31\u53EF" },
      /** Motion permission card, shown once over the app on iPhone and iPad: the question it asks, naming what shaking does and that the system asks once more after Allow */
      question: {
        en: "Shake to send gratitude? After you allow it, you\u2019ll be asked once more.",
        ja: "\u7AEF\u672B\u3092\u632F\u3063\u3066\u611F\u8B1D\u3092\u9001\u308A\u307E\u305B\u3093\u304B\uFF1F\u8A31\u53EF\u3059\u308B\u3068\u3001\u3082\u3046\u4E00\u5EA6\u78BA\u8A8D\u304C\u8868\u793A\u3055\u308C\u307E\u3059\u3002"
      },
      /** Motion permission card: the key that grants motion access, after which iOS or iPadOS shows its own prompt */
      allow: { en: "Allow", ja: "\u8A31\u53EF\u3059\u308B" },
      /** Motion permission card: the quiet link under Allow that declines */
      dontAllow: { en: "Don\u2019t allow", ja: "\u8A31\u53EF\u3057\u306A\u3044" }
    }
  };

  // apps/frontend/src/i18n/strings/errors.ts
  var errors = {
    /** Any screen that shows a failed request through problemOf, when the server answers a code this catalog lacks (such as route_not_found); {{code}} is that code */
    unknown: {
      en: "Something went wrong ({{code}}). Try again. If it keeps happening, tell the Croquis Official account in LINE.",
      ja: "\u554F\u984C\u304C<wbr/>\u767A\u751F\u3057\u307E\u3057\u305F\uFF08{{code}}\uFF09\u3002<wbr/>\u3082\u3046\u4E00\u5EA6<wbr/>\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002<wbr/>\u7D9A\u304F\u5834\u5408\u306F\u3001<wbr/>LINE\u306E<wbr/>\u30AF\u30ED\u30C3\u30AD\u30FC<wbr/>\u516C\u5F0F\u30A2\u30AB\u30A6\u30F3\u30C8\u306B<wbr/>\u304A\u77E5\u3089\u305B\u304F\u3060\u3055\u3044\u3002"
    },
    /** Any screen, when a request gets no answer (offline, or it failed before a reply): shown through problemOf by the screen that made it */
    network: {
      en: "Couldn\u2019t connect. Check your connection, then try again.",
      ja: "\u3064\u306A\u304C\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002<wbr/>\u63A5\u7D9A\u3092<wbr/>\u78BA\u8A8D\u3057\u3066\u3001<wbr/>\u3082\u3046\u4E00\u5EA6<wbr/>\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
    },
    /** Sign-in screen, under “Couldn’t sign you in”, over Reconnect with LINE: LINE is logged in but hands over no ID token to sign in to the app's server with (made by the app itself, shown through errorMessage) */
    no_line_token: {
      en: "LINE didn\u2019t sign you in. Reconnect with LINE to try again.",
      ja: "LINE\u306E<wbr/>\u30ED\u30B0\u30A4\u30F3\u60C5\u5831\u3092<wbr/>\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002<wbr/>LINE\u3067<wbr/>\u518D\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
    },
    /** Sign-in screen, under “Couldn’t sign you in”, over Reconnect with LINE: tapping it couldn't restart LINE Login (made by the app itself, shown through errorMessage) */
    line_reconnect_failed: {
      en: "Couldn\u2019t reconnect with LINE. Try again, or reopen the app from LINE.",
      ja: "LINE\u3067<wbr/>\u518D\u30ED\u30B0\u30A4\u30F3\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002<wbr/>\u3082\u3046\u4E00\u5EA6<wbr/>\u8A66\u3059\u304B\u3001<wbr/>LINE\u304B\u3089<wbr/>\u30A2\u30D7\u30EA\u3092<wbr/>\u3072\u3089\u304D\u76F4\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
    },
    /** Giving and Receiving: giving an 18+ sticker from a board (POST /api/gifts) to someone without Show 18+ stickers on, or receiving one (POST /api/gifts/receive) without it; in “couldn’t be packed” or the gift's refusal, through problemOf */
    nsfw_not_opted_in: {
      en: "Only people who turned on Show 18+ stickers in Settings can receive 18+ stickers.",
      ja: "18+\u306E\u30B7\u30FC\u30EB\u3092\u53D7\u3051\u53D6\u308C\u308B\u306E\u306F\u3001\u8A2D\u5B9A\u3067\u300C18+\u306E\u30B7\u30FC\u30EB\u3092\u8868\u793A\u3059\u308B\u300D\u3092\u30AA\u30F3\u306B\u3057\u305F\u4EBA\u3060\u3051\u3067\u3059\u3002"
    },
    /** Sticker detail, Mark 18+ or Remove 18+: marking a sticker (POST /api/stickers/:stickerId/nsfw) that someone else drew, or taking its mark off (DELETE), in the detail's error line */
    not_original_artist: {
      en: "Only the person who drew this sticker can mark it 18+ or remove 18+.",
      ja: "18+\u306B\u3057\u305F\u308A\u5916\u3057\u305F\u308A\u3067\u304D\u308B\u306E\u306F\u3001\u3053\u306E\u30B7\u30FC\u30EB\u306E\u4F5C\u8005\u3060\u3051\u3067\u3059\u3002"
    },
    /** Sticker detail, Mark 18+: marking a sticker (POST /api/stickers/:stickerId/nsfw) that's already marked, such as from another window, in the detail's error line */
    already_nsfw: {
      en: "This sticker is already marked 18+.",
      ja: "\u3053\u306E\u30B7\u30FC\u30EB\u306F\u3001\u3059\u3067\u306B18+\u3067\u3059\u3002"
    },
    /** Giving, In the bag: taking a gift back out (POST /api/gifts/:giftId/take-out) that its receiver already received, in “couldn’t be taken out” through problemOf; the Receive gift dialog shows its own Already opened screen instead */
    already_received: {
      en: "This gift was already opened.",
      ja: "\u3053\u306E\u30AE\u30D5\u30C8\u306F\u3001\u3059\u3067\u306B\u3072\u3089\u304B\u308C\u3066\u3044\u307E\u3059\u3002"
    },
    /** Giving, Receiving, the Shop and the reserve ticket checkout: packing a gift, opening a gift's link, Accept, taking a gift out, the deposit's check after Send, reading when a gift expires, loading where packs are paid or paying, when Sui can't be read, through the error line */
    chain_unavailable: {
      en: "Couldn\u2019t reach Sui just now. Try again in a moment.",
      ja: "\u3044\u307ESui\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093\u3002\u5C11\u3057\u5F85\u3063\u3066\u304B\u3089\u3001\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
    },
    /** Receive gift dialog, Accept sheet: tapping Accept (POST /api/gifts/receive, or /:giftId/receive from the board) when the chain fails or doesn't confirm the sticker's claim, in “… wasn’t received” through problemOf; a gift its giver took back, or that went back to them, answers its own refusal instead */
    claim_failed: {
      en: "It couldn\u2019t be confirmed. Trying again is safe, since a gift is only ever received once, but it may not work.",
      ja: "\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u53D7\u3051\u53D6\u308A\u306F\u4E00\u5EA6\u304D\u308A\u306A\u306E\u3067\u3001\u3084\u308A\u76F4\u3057\u3066\u3082\u5927\u4E08\u592B\u3067\u3059\u304C\u3001\u3046\u307E\u304F\u3044\u304B\u306A\u3044\u3053\u3068\u3082\u3042\u308A\u307E\u3059\u3002"
    },
    /** Giving, In the bag: packing a sticker when Sui's answer to its signed deposit (POST /api/gifts/:giftId/deposit) never came, in “couldn’t be packed” through problemOf; Send in LINE sends the same deposit again */
    deposit_not_landed: {
      en: "Sui hasn\u2019t answered about your sticker yet. Tap Send in LINE to check again; it won\u2019t move twice.",
      ja: "\u30B7\u30FC\u30EB\u306B\u3064\u3044\u3066Sui\u304B\u3089\u306E\u5FDC\u7B54\u304C\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002\u300CLINE\u3067\u9001\u308B\u300D\u3092\u30BF\u30C3\u30D7\u3057\u3066\u3001\u3082\u3046\u4E00\u5EA6\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u4E8C\u91CD\u306B\u52D5\u304F\u3053\u3068\u306F\u3042\u308A\u307E\u305B\u3093\u3002"
    },
    /** Giving, while starting a Gift Message: another attempt needs the giver's confirmation. */
    gift_message_unresolved: {
      en: "This gift may already have been sent. Close and reopen Giving to check its outcome.",
      ja: "\u3053\u306E\u30AE\u30D5\u30C8\u306F\u9001\u4FE1\u6E08\u307F\u306E\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002\u8D08\u308B\u753B\u9762\u3092\u9589\u3058\u3066\u958B\u304D\u76F4\u3057\u3001\u7D50\u679C\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
    },
    /** Giving, while recording LINE's outcome: another message attempt has replaced this one. */
    gift_message_attempt_changed: {
      en: "This gift\u2019s message attempt changed. Close and reopen Giving to recover its current state.",
      ja: "\u3053\u306E\u30AE\u30D5\u30C8\u306E\u9001\u4FE1\u72B6\u6CC1\u304C\u5909\u308F\u308A\u307E\u3057\u305F\u3002\u8D08\u308B\u753B\u9762\u3092\u9589\u3058\u3066\u958B\u304D\u76F4\u3057\u3001\u73FE\u5728\u306E\u72B6\u6CC1\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
    },
    /** Giving, In the bag: recording LINE's picker outcome (POST /api/gifts/:giftId/shared) for a gift that's no longer packed or sent, or taking out a gift already returned, in “couldn’t record” or “couldn’t be taken out” through problemOf */
    gift_closed: {
      en: "This gift is already closed. Go back to your board, and if your sticker is there, give it again.",
      ja: "\u3053\u306E\u30AE\u30D5\u30C8\u306F\u3059\u3067\u306B\u9589\u3058\u3089\u308C\u3066\u3044\u307E\u3059\u3002\u30DC\u30FC\u30C9\u306B\u623B\u3063\u3066\u3001\u30B7\u30FC\u30EB\u304C\u3042\u308C\u3070\u3082\u3046\u4E00\u5EA6\u8D08\u3063\u3066\u304F\u3060\u3055\u3044\u3002"
    },
    /** Receiving: opening a gift message's link (POST /api/gifts/preview or /receive) after the gift expired unopened; the Receive gift dialog shows its own returned-gift screen instead, so this is errorMessage's fallback */
    gift_expired: {
      en: "This gift wasn\u2019t opened in time.",
      ja: "\u3053\u306E\u30AE\u30D5\u30C8\u306F\u3001\u671F\u9650\u5185\u306B\u3072\u3089\u304B\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002"
    },
    /** Giving, In the bag: packing a sticker (POST /api/gifts) that's already in another open gift, in “couldn’t be packed” through problemOf */
    gift_in_transit: {
      en: "This sticker is already on its way in a gift.",
      ja: "\u3053\u306E\u30B7\u30FC\u30EB\u306F\u3001\u3059\u3067\u306B\u30AE\u30D5\u30C8\u3068\u3057\u3066\u8D08\u3089\u308C\u3066\u3044\u308B\u9014\u4E2D\u3067\u3059\u3002"
    },
    /** Giving, In the bag: packing a sticker (POST /api/gifts) or taking a gift out (POST /api/gifts/:giftId/take-out/start) after a day of more packing and taking out than anyone giving does, in “couldn’t be packed” or “couldn’t be taken out” through problemOf */
    giving_limit_reached: {
      en: "You\u2019ve put stickers in gift bags and taken them out many times today. Try again tomorrow.",
      ja: "\u4ECA\u65E5\u306F\u30B7\u30FC\u30EB\u3092\u30AE\u30D5\u30C8\u888B\u306B\u5165\u308C\u305F\u308A\u53D6\u308A\u51FA\u3057\u305F\u308A\u3057\u305F\u56DE\u6570\u304C\u591A\u3059\u304E\u307E\u3059\u3002\u660E\u65E5\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
    },
    /** Giving, In the bag: a deposit, picker outcome or take-out (POST /api/gifts/:giftId/…) for a gift that doesn't exist, through problemOf; the Receive gift dialog and the Gratitude Mini-game show their own lines for it instead */
    gift_not_found: {
      en: "Couldn\u2019t find this gift. Go back to your board and give the sticker again.",
      ja: "\u3053\u306E\u30AE\u30D5\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u30DC\u30FC\u30C9\u306B\u623B\u3063\u3066\u3001\u3082\u3046\u4E00\u5EA6\u30B7\u30FC\u30EB\u3092\u8D08\u3063\u3066\u304F\u3060\u3055\u3044\u3002"
    },
    /** Gratitude Mini-game: recording a combo (POST /api/gratitude) for a gift not received yet; the Mini-game's receipt shows its own note instead, so this is errorMessage's fallback */
    gift_not_received: {
      en: "This gift hasn\u2019t been received yet.",
      ja: "\u3053\u306E\u30AE\u30D5\u30C8\u306F\u3001\u307E\u3060\u53D7\u3051\u53D6\u3089\u308C\u3066\u3044\u307E\u305B\u3093\u3002"
    },
    /** Receiving: opening a gift message's link (POST /api/gifts/preview or /receive) after the gift expired and went back to its giver; the Receive gift dialog shows its own returned-gift screen instead */
    gift_returned: {
      en: "This gift went back to its giver.",
      ja: "\u3053\u306E\u30AE\u30D5\u30C8\u306F\u3001\u8D08\u308A\u4E3B\u306E\u3082\u3068\u306B\u623B\u308A\u307E\u3057\u305F\u3002"
    },
    /** Gratitude Mini-game: recording a combo (POST /api/gratitude) for a gift that already has Gratitude; the Mini-game's receipt shows its own note instead, so this is errorMessage's fallback */
    gratitude_already_recorded: {
      en: "Gratitude for this gift is already in.",
      ja: "\u3053\u306E\u30AE\u30D5\u30C8\u3078\u306E\u611F\u8B1D\u306F\u3001\u3059\u3067\u306B\u5C4A\u3044\u3066\u3044\u307E\u3059\u3002"
    },
    /** Sticker detail's Transfer Trail: loading a gift's Gratitude replay (GET /api/gratitude/:giftId) when none was recorded, in “Couldn’t load the replay” through problemOf */
    gratitude_not_found: {
      en: "There\u2019s no gratitude for this gift yet.",
      ja: "\u3053\u306E\u30AE\u30D5\u30C8\u3078\u306E\u611F\u8B1D\u306F\u3001\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002"
    },
    /** Receiving: opening a gift message's link in a group chat (POST /api/gifts/preview or /receive); the Receive gift dialog shows its own “Open this in your chat” screen instead */
    group_chat: {
      en: "Gifts open only in the private chat they were sent to.",
      ja: "\u30AE\u30D5\u30C8\u306F\u3001\u9001\u3089\u308C\u305F1\u5BFE1\u306E\u30C8\u30FC\u30AF\u3067\u3057\u304B\u3072\u3089\u3051\u307E\u305B\u3093\u3002"
    },
    /** Handle prompt: saving a handle (POST /api/me/handle) that breaks the rules; the prompt shows its own api.handle.invalid line instead, so this is errorMessage's fallback */
    handle_invalid: {
      en: "That handle doesn\u2019t fit the rules.",
      ja: "\u305D\u306E\u30E6\u30FC\u30B6\u30FC\u540D\u306F\u3001\u30EB\u30FC\u30EB\u306B\u5408\u3063\u3066\u3044\u307E\u305B\u3093\u3002"
    },
    /** Handle prompt: saving a handle (POST /api/me/handle) someone else has; the prompt shows its own api.handle.taken line instead, so this is errorMessage's fallback */
    handle_taken: {
      en: "Someone else has that handle.",
      ja: "\u305D\u306E\u30E6\u30FC\u30B6\u30FC\u540D\u306F\u3001\u307B\u304B\u306E\u4EBA\u304C\u4F7F\u3063\u3066\u3044\u307E\u3059\u3002"
    },
    /** Any screen, when the server fails unexpectedly (500), through problemOf; also the reserve ticket checkout after paying, when Sui doesn't verify the payment (POST /api/ticket-purchases) */
    internal_error: {
      en: "Something went wrong on our side. Try again in a moment.",
      ja: "\u3053\u3061\u3089\u5074\u3067<wbr/>\u554F\u984C\u304C<wbr/>\u767A\u751F\u3057\u307E\u3057\u305F\u3002<wbr/>\u5C11\u3057<wbr/>\u5F85\u3063\u3066\u304B\u3089\u3001<wbr/>\u3082\u3046\u4E00\u5EA6<wbr/>\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
    },
    /** Any screen, when the server can't read a request (400), through problemOf; e.g. the Drawing screen's seal chip when a seal's images are malformed (POST /api/stickers) */
    invalid_request: {
      en: "Croquis couldn\u2019t read what your device sent. Try again. If it keeps happening, tell the Croquis Official account in LINE.",
      ja: "\u30AF\u30ED\u30C3\u30AD\u30FC\u304C<wbr/>\u305D\u306E\u5185\u5BB9\u3092<wbr/>\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002<wbr/>\u3082\u3046\u4E00\u5EA6<wbr/>\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002<wbr/>\u7D9A\u304F\u5834\u5408\u306F\u3001<wbr/>LINE\u306E<wbr/>\u30AF\u30ED\u30C3\u30AD\u30FC<wbr/>\u516C\u5F0F\u30A2\u30AB\u30A6\u30F3\u30C8\u306B<wbr/>\u304A\u77E5\u3089\u305B\u304F\u3060\u3055\u3044\u3002"
    },
    /** Sign-in screen, under “Couldn’t sign you in”, over Reconnect with LINE: signing in to the app's server (POST /api/session) when LINE refuses the ID token, through errorMessage */
    line_token_invalid: {
      en: "LINE didn\u2019t accept this sign-in. Reconnect with LINE. If it keeps happening, tell the Croquis Official account in LINE.",
      ja: "LINE\u304C<wbr/>\u30ED\u30B0\u30A4\u30F3\u60C5\u5831\u3092<wbr/>\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002<wbr/>LINE\u3067<wbr/>\u518D\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044\u3002<wbr/>\u7D9A\u304F\u5834\u5408\u306F\u3001<wbr/>LINE\u306E<wbr/>\u30AF\u30ED\u30C3\u30AD\u30FC<wbr/>\u516C\u5F0F\u30A2\u30AB\u30A6\u30F3\u30C8\u306B<wbr/>\u304A\u77E5\u3089\u305B\u304F\u3060\u3055\u3044\u3002"
    },
    /** Sign-in screen, under “Couldn’t sign you in”, over Reconnect with LINE: signing in to the app's server (POST /api/session) with an expired LINE ID token, through errorMessage. Also Giving, Receiving and the reserve ticket checkout, through problemOf, when a chain action or a payment waited on Privy and Privy couldn't sign in because LINE's ID token had expired (made by the app itself) */
    line_token_expired: {
      en: "Your LINE sign-in has expired. Reconnect with LINE to continue.",
      ja: "LINE\u306E<wbr/>\u30ED\u30B0\u30A4\u30F3\u60C5\u5831\u306E<wbr/>\u6709\u52B9\u671F\u9650\u304C<wbr/>\u5207\u308C\u307E\u3057\u305F\u3002<wbr/>LINE\u3067<wbr/>\u518D\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
    },
    /** Signing in (POST /api/session), and wherever errorMessage shows a refusal of POST /api/line-menu: LINE didn't answer when the app's server checked your sign-in or linked your chat menu. The developer slip's Chat menu row shows the code instead */
    line_unavailable: {
      en: "LINE didn\u2019t answer. Try again in a moment.",
      ja: "LINE\u304B\u3089<wbr/>\u5FDC\u7B54\u304C<wbr/>\u3042\u308A\u307E\u305B\u3093\u3002<wbr/>\u5C11\u3057<wbr/>\u5F85\u3063\u3066\u304B\u3089\u3001<wbr/>\u3082\u3046\u4E00\u5EA6<wbr/>\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
    },
    /** Drawing screen, after tapping the check to seal: a sticker that saved but whose NFT mint wasn't confirmed (POST /api/stickers); the seal chip words this itself, so this is errorMessage's fallback */
    mint_failed: {
      en: "Your sticker is saved, but it couldn\u2019t be sealed on-chain. Try again; it won\u2019t use another ticket.",
      ja: "\u30B7\u30FC\u30EB\u306F\u4FDD\u5B58\u3055\u308C\u307E\u3057\u305F\u304C\u3001\u30D6\u30ED\u30C3\u30AF\u30C1\u30A7\u30FC\u30F3\u4E0A\u3067\u4ED5\u4E0A\u3052\u3089\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002\u30C1\u30B1\u30C3\u30C8\u3092\u65B0\u305F\u306B\u4F7F\u3046\u3053\u3068\u306F\u3042\u308A\u307E\u305B\u3093\u3002"
    },
    /** Drawing screen, starting a sticker: spending a ticket (POST /api/tickets/spend) with no daily or reserve tickets left, in the start card's “Couldn’t start your sticker” through errorMessage */
    no_tickets_left: { en: "You\u2019re out of tickets.", ja: "\u30C1\u30B1\u30C3\u30C8\u304C\u6B8B\u3063\u3066\u3044\u307E\u305B\u3093\u3002" },
    /** Giving, In the bag: recording that the gift was sent (POST /api/gifts/:giftId/shared) before its deposit landed in the escrow, in “couldn’t record” through problemOf; the Receive gift dialog shows its own “Almost here” screen instead */
    not_deposited: {
      en: "Your sticker hasn\u2019t reached the gift bag yet. Wait a moment, then try again.",
      ja: "\u30B7\u30FC\u30EB\u304C\u307E\u3060\u30AE\u30D5\u30C8\u888B\u306B\u5C4A\u3044\u3066\u3044\u307E\u305B\u3093\u3002\u5C11\u3057\u5F85\u3063\u3066\u304B\u3089\u3001\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
    },
    /** Sticker detail's Transfer Trail: marking a Gratitude replay watched (POST /api/gratitude/:giftId/seen) by anyone but the gift's giver, in “Couldn’t mark this gratitude watched” through problemOf; the card marks it only for the giver */
    not_giver: { en: "Only the giver can do that.", ja: "\u305D\u308C\u304C\u3067\u304D\u308B\u306E\u306F\u8D08\u308A\u4E3B\u3060\u3051\u3067\u3059\u3002" },
    /** Giving, In the bag: packing a sticker (POST /api/gifts) whose NFT isn't minted yet, in “couldn’t be packed” through problemOf */
    not_minted: {
      en: "This sticker isn\u2019t sealed on-chain yet.",
      ja: "\u3053\u306E\u30B7\u30FC\u30EB\u306F\u3001\u307E\u3060\u30D6\u30ED\u30C3\u30AF\u30C1\u30A7\u30FC\u30F3\u4E0A\u3067\u4ED5\u4E0A\u304C\u3063\u3066\u3044\u307E\u305B\u3093\u3002"
    },
    /** Gratitude Mini-game: recording a combo (POST /api/gratitude) on a gift someone else received; the Mini-game's receipt shows its own note instead, so this is errorMessage's fallback */
    not_receiver: {
      en: "Only the gift\u2019s receiver can do that.",
      ja: "\u305D\u308C\u304C\u3067\u304D\u308B\u306E\u306F\u3001\u30AE\u30D5\u30C8\u3092\u53D7\u3051\u53D6\u3063\u305F\u4EBA\u3060\u3051\u3067\u3059\u3002"
    },
    /** Giving, In the bag: packing a sticker someone else holds (POST /api/gifts), or a deposit, picker outcome or take-out on someone else's gift, through problemOf */
    not_yours: { en: "That sticker isn\u2019t yours.", ja: "\u305D\u306E\u30B7\u30FC\u30EB\u306F\u3001\u3042\u306A\u305F\u306E\u3082\u306E\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002" },
    /** Receiving: the giver opening their own gift message's link (POST /api/gifts/preview or /receive); the Receive gift dialog shows its own “This gift is on its way” screen instead */
    own_gift: { en: "You can\u2019t open your own gift.", ja: "\u81EA\u5206\u304C\u8D08\u3063\u305F\u30AE\u30D5\u30C8\u306F\u3001\u3072\u3089\u3051\u307E\u305B\u3093\u3002" },
    /** Reserve ticket checkout, after tapping Pay: starting the purchase (POST /api/ticket-purchases/start) for a pack size the shop doesn't sell, under “Payment didn’t go through” through errorMessage; nothing was paid */
    pack_unknown: { en: "That ticket pack doesn\u2019t exist.", ja: "\u305D\u306E\u30C1\u30B1\u30C3\u30C8\u30D1\u30C3\u30AF\u306F\u3042\u308A\u307E\u305B\u3093\u3002" },
    /** Reserve ticket checkout, after tapping Get it free: taking the free first pack (POST /api/ticket-purchases/start) when you've already had it, such as in another window, under “Payment didn’t go through” through errorMessage; Back to the packs shows its price now */
    free_pack_used: {
      en: "You\u2019ve already had your free pack.",
      ja: "\u7121\u6599\u30D1\u30C3\u30AF\u306F\u3059\u3067\u306B\u3082\u3089\u3063\u3066\u3044\u307E\u3059\u3002"
    },
    /** Reserve ticket checkout, after tapping Pay: starting the purchase (POST /api/ticket-purchases/start) of a pack whose price changed since the checkout showed it, under “Payment didn’t go through” through errorMessage; nothing was paid */
    price_changed: {
      en: "This pack\u2019s price has changed, so nothing was paid.",
      ja: "\u3053\u306E\u30D1\u30C3\u30AF\u306E\u4FA1\u683C\u304C\u5909\u308F\u3063\u305F\u305F\u3081\u3001\u652F\u6255\u3044\u306F\u884C\u308F\u308C\u3066\u3044\u307E\u305B\u3093\u3002"
    },
    /** Reserve ticket checkout, after paying: the reason in “Tickets not added yet” when Sui's answer to the signed payment (POST /api/ticket-purchases) never came, under the key that sends it again */
    payment_not_landed: {
      en: "Sui hasn\u2019t answered about the payment yet.",
      ja: "\u652F\u6255\u3044\u306B\u3064\u3044\u3066Sui\u304B\u3089\u306E\u5FDC\u7B54\u304C\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002"
    },
    /** Reserve ticket checkout, after paying: adding the tickets (POST /api/ticket-purchases) for someone else's purchase, or for a payment into the ticket vault that names someone else, in “Tickets not added yet” through errorReason */
    payment_not_yours: {
      en: "That payment was made for someone else\u2019s tickets.",
      ja: "\u3053\u306E\u652F\u6255\u3044\u306F\u5225\u306E\u4EBA\u306E\u30C1\u30B1\u30C3\u30C8\u306E\u3082\u306E\u3067\u3059\u3002"
    },
    /** Reserve ticket checkout, after paying: adding the tickets (POST /api/ticket-purchases) for a purchase the server has no record of, in “Tickets can’t be added” through errorReason */
    purchase_not_found: {
      en: "The Shop has no record of this purchase.",
      ja: "\u30B7\u30E7\u30C3\u30D7\u306B\u3053\u306E\u8CFC\u5165\u306E\u8A18\u9332\u304C\u3042\u308A\u307E\u305B\u3093\u3002"
    },
    /** Gratitude Mini-game: recording a combo (POST /api/gratitude) whose replay fails the server's checks; the Mini-game's receipt shows its own note instead, so this is errorMessage's fallback */
    replay_invalid: {
      en: "The gratitude replay couldn\u2019t be read.",
      ja: "\u611F\u8B1D\u306E\u30EA\u30D7\u30EC\u30A4\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002"
    },
    /** Initial sign-in screen or a request's local error: the session is absent; established-session expiry has its own Reload explanation */
    signed_out: {
      en: "You\u2019re signed out. Reopen Croquis from LINE to sign in again.",
      ja: "\u30ED\u30B0\u30A2\u30A6\u30C8\u3055\u308C\u307E\u3057\u305F\u3002<wbr/>LINE\u304B\u3089<wbr/>\u30AF\u30ED\u30C3\u30AD\u30FC\u3092<wbr/>\u3072\u3089\u304D\u76F4\u3057\u3066\u3001<wbr/>\u3082\u3046\u4E00\u5EA6<wbr/>\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
    },
    /** Sign-in screen, when a request belongs to a different account: explains why Reload is required */
    session_account_changed: {
      en: "The signed-in account changed. Reload to continue. Your saved gratitude stays with its account.",
      ja: "\u30ED\u30B0\u30A4\u30F3\u4E2D\u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u304C\u5909\u308F\u308A\u307E\u3057\u305F\u3002\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u3066\u7D9A\u3051\u3066\u304F\u3060\u3055\u3044\u3002\u4FDD\u5B58\u3055\u308C\u305F\u611F\u8B1D\u306F\u3001\u5143\u306E\u30A2\u30AB\u30A6\u30F3\u30C8\u306B\u6B8B\u308A\u307E\u3059\u3002"
    },
    /** Sticker detail: loading where it's been (GET /api/stickers/:stickerId), in “Couldn’t load where it’s been…”, or Giving: packing it (POST /api/gifts), in “couldn’t be packed”, through problemOf */
    sticker_not_found: {
      en: "Couldn\u2019t find this sticker. Go back to your board and try again.",
      ja: "\u3053\u306E\u30B7\u30FC\u30EB\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u30DC\u30FC\u30C9\u306B\u623B\u3063\u3066\u3001\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
    },
    /** Your sticker board: saving where a sticker sits after you move it (PATCH /api/sticker-boards/me/sticker-placements/:stickerId) when it never reached you, in “Couldn’t save where … sits” through problemOf */
    sticker_placement_not_found: {
      en: "That sticker isn\u2019t on your sticker board.",
      ja: "\u305D\u306E\u30B7\u30FC\u30EB\u306F\u3001\u3042\u306A\u305F\u306E\u30B7\u30FC\u30EB\u30DC\u30FC\u30C9\u306B\u3042\u308A\u307E\u305B\u3093\u3002"
    },
    /** Giving, Receiving and the reserve ticket checkout: your Sui address, which keeps your stickers and pays, wasn't ready in time, Privy couldn't make it or start its signer, or Privy failed again after one fresh try; the reason follows in brackets, and nothing moved (made by the app itself, shown through problemOf); the drawing screen's seal chip words this failure itself */
    sui_wallet_not_ready: {
      en: "Your Sui address isn\u2019t ready yet. Try again.",
      ja: "Sui\u30A2\u30C9\u30EC\u30B9\u306E\u6E96\u5099\u304C\u307E\u3060\u3067\u304D\u3066\u3044\u307E\u305B\u3093\u3002\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
    },
    /** Receiving: opening a gift message's link (POST /api/gifts/preview or /receive) after the giver took the gift back; the Receive gift dialog shows its own “took this one back” screen instead */
    taken_back: { en: "The giver took this gift back.", ja: "\u8D08\u308A\u4E3B\u304C\u3053\u306E\u30AE\u30D5\u30C8\u3092\u53D6\u308A\u6D88\u3057\u307E\u3057\u305F\u3002" },
    /** Giving, In the bag: taking a sticker out when Sui's answer to its signed take-out (POST /api/gifts/:giftId/take-out) never came, in “couldn’t be taken out” through problemOf; Take it out sends the same take-out again */
    take_out_not_landed: {
      en: "Sui hasn\u2019t answered about taking your sticker out yet. Try again; it won\u2019t move twice.",
      ja: "\u30B7\u30FC\u30EB\u306E\u53D6\u308A\u51FA\u3057\u306B\u3064\u3044\u3066Sui\u304B\u3089\u306E\u5FDC\u7B54\u304C\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002\u4E8C\u91CD\u306B\u52D5\u304F\u3053\u3068\u306F\u3042\u308A\u307E\u305B\u3093\u3002"
    },
    /** Drawing screen, after tapping the check to seal: the seal chip's reason when the drawing's ticket already became a sticker (POST /api/stickers), through errorMessage */
    ticket_already_used: {
      en: "That ticket was already used.",
      ja: "\u305D\u306E\u30C1\u30B1\u30C3\u30C8\u306F\u3001\u3059\u3067\u306B\u4F7F\u308F\u308C\u3066\u3044\u307E\u3059\u3002"
    },
    /** Drawing screen, starting a sticker: spending a ticket (POST /api/tickets/spend) when the next one isn't the daily or reserve kind the start card offered, in the start card's “Couldn’t start your sticker” through errorMessage */
    ticket_kind_changed: {
      en: "Your tickets changed. Try again.",
      ja: "\u30C1\u30B1\u30C3\u30C8\u306E\u72B6\u6CC1\u304C\u5909\u308F\u308A\u307E\u3057\u305F\u3002\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
    },
    /** Drawing screen, after tapping the check to seal: the seal chip's reason when the ticket the drawing started on doesn't exist (POST /api/stickers), through errorMessage */
    ticket_not_found: {
      en: "Couldn\u2019t find that ticket. If it keeps happening, tell the Croquis Official account in LINE.",
      ja: "\u305D\u306E\u30C1\u30B1\u30C3\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u7D9A\u304F\u5834\u5408\u306F\u3001LINE\u306E\u30AF\u30ED\u30C3\u30AD\u30FC\u516C\u5F0F\u30A2\u30AB\u30A6\u30F3\u30C8\u306B\u304A\u77E5\u3089\u305B\u304F\u3060\u3055\u3044\u3002"
    },
    /** Drawing screen, after tapping the check to seal: the seal chip's reason when the ticket the drawing started on is someone else's (POST /api/stickers), through errorMessage */
    ticket_not_yours: {
      en: "That ticket isn\u2019t yours.",
      ja: "\u305D\u306E\u30C1\u30B1\u30C3\u30C8\u306F\u3001\u3042\u306A\u305F\u306E\u3082\u306E\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002"
    },
    /** Sticker replay: an older app must reload before reading the recording. */
    timelapse_format_unsupported: {
      en: "Reload Croquis to play this timelapse.",
      ja: "\u30BF\u30A4\u30E0\u30E9\u30D7\u30B9\u3092\u898B\u308B\u306B\u306F\u3001\u30AF\u30ED\u30C3\u30AD\u30FC\u3092\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
    },
    /** Sticker detail: loading a sticker's timelapse (GET /api/stickers/:stickerId/timelapse) when it was sealed without one, in “Couldn’t load the timelapse” through problemOf; Timelapse shows only for stickers that have one */
    timelapse_not_found: {
      en: "This sticker was sealed without its timelapse.",
      ja: "\u3053\u306E\u30B7\u30FC\u30EB\u306F\u3001\u30BF\u30A4\u30E0\u30E9\u30D7\u30B9\u306A\u3057\u3067\u4ED5\u4E0A\u3052\u3089\u308C\u307E\u3057\u305F\u3002"
    },
    /** An artist's sticker board: loading their board or stats (GET /api/sticker-boards/:userId, …/user-stats) for a person who doesn't exist, in “Couldn’t load …’s board” or “Their stats didn’t load” through problemOf */
    user_not_found: {
      en: "Couldn\u2019t find that artist. Search for them in Explore to check the handle.",
      ja: "\u305D\u306E\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u300C\u767A\u898B\u300D\u3067\u30E6\u30FC\u30B6\u30FC\u540D\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
    },
    /** Giving and the reserve ticket checkout: a deposit, take-out or payment (POST /api/gifts/…, /api/ticket-purchases) signed after the server's sponsorship of it lapsed, so it was never sent; Giving packs again by itself first, so it shows only when that fails too, through problemOf */
    sponsorship_expired: {
      en: "That took too long, so it wasn\u2019t sent, and nothing moved. Try again.",
      ja: "\u6642\u9593\u304C\u304B\u304B\u308A\u3059\u304E\u305F\u305F\u3081\u9001\u4FE1\u3055\u308C\u305A\u3001\u4F55\u3082\u52D5\u3044\u3066\u3044\u307E\u305B\u3093\u3002\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
    },
    /** Giving and the reserve ticket checkout: a deposit, take-out or payment (POST /api/gifts/…, /api/ticket-purchases) whose signature isn't your Sui account's, through problemOf */
    signature_invalid: {
      en: "Your Sui account\u2019s signature didn\u2019t match, so nothing moved. Try again.",
      ja: "Sui\u30A2\u30AB\u30A6\u30F3\u30C8\u306E\u7F72\u540D\u304C\u4E00\u81F4\u3057\u306A\u304B\u3063\u305F\u305F\u3081\u3001\u4F55\u3082\u52D5\u3044\u3066\u3044\u307E\u305B\u3093\u3002\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
    },
    /** Giving and the reserve ticket checkout: a deposit, take-out or payment (POST /api/gifts/…, /api/ticket-purchases) that Sui ran and failed; Sui's own words follow as fine print, through problemOf */
    transaction_failed: {
      en: "Sui ran it, but it failed, so nothing moved.",
      ja: "Sui\u3067\u5B9F\u884C\u3055\u308C\u307E\u3057\u305F\u304C\u5931\u6557\u3057\u305F\u305F\u3081\u3001\u4F55\u3082\u52D5\u3044\u3066\u3044\u307E\u305B\u3093\u3002"
    },
    /** Giving and the reserve ticket checkout: packing a sticker or starting a purchase (POST /api/gifts, /api/ticket-purchases/start) that Sui would refuse, such as a payment the balance can't cover, through problemOf */
    sponsorship_refused: {
      en: "Sui wouldn\u2019t accept this, so it wasn\u2019t sent, and nothing moved.",
      ja: "Sui\u3067\u53D7\u3051\u4ED8\u3051\u3089\u308C\u306A\u3044\u5185\u5BB9\u3060\u3063\u305F\u305F\u3081\u9001\u4FE1\u3055\u308C\u305A\u3001\u4F55\u3082\u52D5\u3044\u3066\u3044\u307E\u305B\u3093\u3002"
    },
    /** Giving and the reserve ticket checkout: packing, taking out or paying when Croquis can't get Sui's network fee paid just now, through problemOf */
    sponsor_unavailable: {
      en: "Croquis can\u2019t send this to Sui just now. Try again in a moment.",
      ja: "\u3044\u307ESui\u306B\u9001\u4FE1\u3067\u304D\u307E\u305B\u3093\u3002\u5C11\u3057\u5F85\u3063\u3066\u304B\u3089\u3001\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
    },
    /** Giving and the reserve ticket checkout: packing, taking out or paying when the funds Croquis pays Sui's network fee from have run out, through problemOf */
    sponsor_fund_empty: {
      en: "Croquis can\u2019t pay Sui\u2019s fee just now. Try again later, and tell the Croquis Official account in LINE if it keeps happening.",
      ja: "\u3044\u307ESui\u306E\u624B\u6570\u6599\u3092\u652F\u6255\u3048\u307E\u305B\u3093\u3002\u6642\u9593\u3092\u304A\u3044\u3066\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002\u7D9A\u304F\u5834\u5408\u306F\u3001LINE\u306E\u30AF\u30ED\u30C3\u30AD\u30FC\u516C\u5F0F\u30A2\u30AB\u30A6\u30F3\u30C8\u306B\u304A\u77E5\u3089\u305B\u304F\u3060\u3055\u3044\u3002"
    },
    /** Sealing, Giving, Receiving and the reserve ticket checkout: the server found no Sui address for you yet (POST /api/stickers, /api/gifts, /api/gifts/receive, /api/ticket-purchases/start), through problemOf */
    no_sui_wallet: {
      en: "Your Sui address isn\u2019t ready yet. Try again in a moment.",
      ja: "Sui\u30A2\u30C9\u30EC\u30B9\u306E\u6E96\u5099\u304C\u307E\u3060\u3067\u304D\u3066\u3044\u307E\u305B\u3093\u3002\u5C11\u3057\u5F85\u3063\u3066\u304B\u3089\u3001\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
    },
    /** Someone else's stat board: loading their Sui address (GET /api/sticker-boards/:userId/sui-address) when Privy, which keeps the wallets, didn't answer; the address paper says it didn't load, with Try again */
    wallet_lookup_failed: {
      en: "Couldn\u2019t get the Sui address just now. Try again in a moment.",
      ja: "Sui\u30A2\u30C9\u30EC\u30B9\u3092\u3044\u307E\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3002\u5C11\u3057\u5F85\u3063\u3066\u304B\u3089\u3001\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
    },
    /** Any error line, when what failed isn't the server's answer but something on this device or in a library, such as LINE's picker; its own English words follow as details for a report (made by the app itself, shown through problemOf) */
    unexpected: {
      en: "Something went wrong. Try again in a moment.",
      ja: "\u554F\u984C\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002\u5C11\u3057\u5F85\u3063\u3066\u304B\u3089\u3001\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
    }
  };

  // apps/frontend/src/i18n/strings/explore.ts
  var explore = {
    search: {
      /** Explore tab, top: placeholder text in the artist search field, beside its @ icon, until you type */
      placeholder: { en: "Search artists", ja: "\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u3092\u3055\u304C\u3059" },
      /** Explore tab, top: screen readers' name for the artist search field */
      label: { en: "Search artists by handle", ja: "\u30E6\u30FC\u30B6\u30FC\u540D\u3067\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u3092\u3055\u304C\u3059" },
      /** Explore tab, top: screen readers' name for the X button that appears in the search field once you've typed, and empties it */
      clear: { en: "Clear search", ja: "\u691C\u7D22\u3092\u30AF\u30EA\u30A2" },
      /** Explore tab, while searching: what screen readers hear while the search is out, from the status line under the search field */
      searching: { en: "Searching\u2026", ja: "\u691C\u7D22\u4E2D\u2026" },
      /** Explore tab, while searching: fine print over the results when one artist's handle matches; screen readers hear it from the status line too */
      artists_one: { en: "{{count}} artist" },
      /** Explore tab, while searching: fine print over the results with how many artists' handles match; screen readers hear it from the status line too */
      artists_other: { en: "{{count}} artists", ja: "\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8{{count}}\u4EBA" },
      notFound: {
        /** Explore tab, after a search that matches no one: the heading, with the searched handle; screen readers hear it from the status line too */
        title: {
          en: "No one here is {{handle}} yet",
          ja: "{{handle}}\u3055\u3093\u306F<wbr/>\u307E\u3060\u30AF\u30ED\u30C3\u30AD\u30FC\u306B<wbr/>\u3044\u307E\u305B\u3093"
        },
        /** Explore tab, after a search that matches no one: the paragraph under the heading, on checking the spelling or inviting a LINE friend with a sticker */
        lead: {
          en: "Handles are exact, so check the spelling with them. If they\u2019re your LINE friend, give them a sticker from your board in a LINE chat: receiving it brings them in.",
          ja: "\u30E6\u30FC\u30B6\u30FC\u540D\u306F\u3064\u3065\u308A\u304C\u6B63\u78BA\u3067\u306A\u3044\u3068\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002\u672C\u4EBA\u306B\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002LINE\u306E\u53CB\u3060\u3061\u306A\u3089\u3001\u30B7\u30FC\u30EB\u30DC\u30FC\u30C9\u304B\u3089\u30C8\u30FC\u30AF\u3067\u30B7\u30FC\u30EB\u3092\u8D08\u308A\u307E\u3057\u3087\u3046\u3002\u53D7\u3051\u53D6\u308C\u3070\u3001\u305D\u306E\u53CB\u3060\u3061\u3082\u30AF\u30ED\u30C3\u30AD\u30FC\u306B\u53C2\u52A0\u3067\u304D\u307E\u3059\u3002"
        }
      }
    },
    /** Explore tab, on opening it: what screen readers hear while the sticker pile or the leaderboards load */
    loading: { en: "Loading Explore", ja: "\u300C\u767A\u898B\u300D\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059" },
    /** Explore tab, a search result or leaderboard row that is you: under your handle, where other people's rows show their LINE name */
    you: { en: "You", ja: "\u3042\u306A\u305F" },
    /** Says which sticker board a tap opens, for assistive tech. */
    stickerBoard: {
      /** Explore tab: screen readers' description of your search result or leaderboard row, after the row's own text: it opens your sticker board when tapped */
      yours: { en: "Your sticker board", ja: "\u3042\u306A\u305F\u306E\u30B7\u30FC\u30EB\u30DC\u30FC\u30C9" },
      /** Explore tab: screen readers' description of someone's search result or leaderboard row, after the row's own text: it opens their sticker board when tapped */
      theirs: { en: "{{handle}}\u2019s sticker board", ja: "{{handle}}\u3055\u3093\u306E\u30B7\u30FC\u30EB\u30DC\u30FC\u30C9" }
    },
    /** The switch under the search between Explore's two views. */
    views: {
      /** Explore tab, under the search field: screen readers' name for the switch between the sticker pile and This week */
      label: { en: "Explore", ja: "\u767A\u898B" },
      /** Explore tab, under the search field: the switch's first half, which shows the sticker pile */
      stickers: { en: "Stickers", ja: "\u30B7\u30FC\u30EB" },
      /** Explore tab, under the search field: the switch's second half, which shows this week's leaderboards */
      thisWeek: { en: "This week", ja: "\u4ECA\u9031" }
    },
    /** The sticker pile: each day's stickers heaped on its own perforated floor. */
    pile: {
      /** Explore tab, Stickers view: screen readers' heading for today's heap */
      today: { en: "Today", ja: "\u4ECA\u65E5" },
      /** Explore tab, Stickers view: screen readers' heading for yesterday's heap; older days are their date, in the app's language */
      yesterday: { en: "Yesterday", ja: "\u6628\u65E5" },
      /** Explore tab, Stickers view: the yellow dot badge on today's perforation, with the date, such as 9.26 */
      todayBadge: { en: "Today {{date}}", ja: "\u4ECA\u65E5\u30FB{{date}}" },
      /** Explore tab, Stickers view: screen readers' name for a sticker in the pile, such as "No.0147 by @mika, 5 min ago"; a tap opens it */
      sticker: { en: "{{number}} by {{artist}}, {{ago}}", ja: "{{artist}}\u306E{{number}}\u3001{{ago}}" },
      /** Explore tab, Stickers view: screen readers' name for a sticker in the pile that was given, with who it last went to */
      stickerGiven: {
        en: "{{number}} by {{artist}}, {{ago}}, given to {{receiver}}",
        ja: "{{artist}}\u306E{{number}}\u3001{{ago}}\u3001{{receiver}}\u3055\u3093\u306B\u8D08\u3089\u308C\u307E\u3057\u305F"
      },
      /** Explore tab, Stickers view: the aqua tag under a given sticker's name tag; <handle/> is who it went to */
      to: { en: "to <handle/>", ja: "<handle/>\u3055\u3093\u3078" },
      /** Explore tab, Stickers view: the line under a faint sticker outline on today's floor while no one has sealed a sticker today */
      empty: {
        en: "The first sticker sealed today lands here.",
        ja: "\u4ECA\u65E5<wbr/>\u3055\u3044\u3057\u3087\u306B\u4ED5\u4E0A\u304C\u3063\u305F\u30B7\u30FC\u30EB\u304C\u3001<wbr/>\u3053\u3053\u306B\u843D\u3061\u3066\u304D\u307E\u3059\u3002"
      },
      /** Explore tab, Stickers view: what screen readers hear once as the pile opens, when one sticker arrived since your last look */
      arrivals_one: { en: "{{count}} new sticker since you last looked" },
      /** Explore tab, Stickers view: what screen readers hear once as the pile opens, when stickers arrived since your last look */
      arrivals_other: {
        en: "{{count}} new stickers since you last looked",
        ja: "\u524D\u306B\u898B\u305F\u3068\u304D\u304B\u3089\u3001\u65B0\u3057\u3044\u30B7\u30FC\u30EB\u304C{{count}}\u679A\u3042\u308A\u307E\u3059"
      },
      /** Older days, a page at a time as the pile's end comes near. */
      older: {
        /** Explore tab, Stickers view, scrolled near the pile's end: what screen readers hear while the next page of older stickers loads under the last day */
        loading: { en: "Loading older stickers", ja: "\u524D\u306E\u65E5\u306E\u30B7\u30FC\u30EB\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059" },
        /** Explore tab, Stickers view, scrolled near the pile's end: what screen readers hear once older days are laid out under it; {{day}} is the oldest now shown, such as September 24 */
        arrived: {
          en: "Older stickers added, back to {{day}}",
          ja: "{{day}}\u307E\u3067\u306E\u30B7\u30FC\u30EB\u3092\u8FFD\u52A0\u3057\u307E\u3057\u305F"
        },
        /** Explore tab, Stickers view, scrolled near the pile's end: the alert where the next older day would be when it didn't load, before Try again; {{reason}} is why */
        failed: {
          en: "Couldn\u2019t load older stickers: {{reason}}",
          ja: "\u524D\u306E\u65E5\u306E\u30B7\u30FC\u30EB\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
        }
      },
      /** How long ago a sticker was sealed, in its largest whole unit. */
      ago: {
        /** Explore tab, Stickers view: the end of a sticker's name for screen readers, sealed under a minute ago */
        justNow: { en: "just now", ja: "\u305F\u3063\u305F\u4ECA" },
        /** Explore tab, Stickers view: the end of a sticker's name for screen readers, sealed a minute to an hour ago */
        minutes: { en: "{{minutes}} min ago", ja: "{{minutes}}\u5206\u524D" },
        /** Explore tab, Stickers view: the end of a sticker's name for screen readers, sealed an hour to a day ago */
        hours: { en: "{{hours}} hr ago", ja: "{{hours}}\u6642\u9593\u524D" },
        /** Explore tab, Stickers view: the end of a sticker's name for screen readers, sealed a day ago */
        days_one: { en: "{{count}} day ago" },
        /** Explore tab, Stickers view: the end of a sticker's name for screen readers, sealed days ago */
        days_other: { en: "{{count}} days ago", ja: "{{count}}\u65E5\u524D" }
      }
    },
    thisWeek: {
      /** Explore tab, This week view: screen readers' heading for the leaderboards */
      title: { en: "This week", ja: "\u4ECA\u9031" },
      /** Explore tab, This week view: fine print under the Most gratitude and Best combo leaderboards, when they start over; {{day}} and {{time}} are that moment in the person's own time zone, such as "Monday" and "12:00 AM" */
      resets: { en: "Resets {{day}} {{time}}", ja: "{{day}}{{time}}\u306B\u30EA\u30BB\u30C3\u30C8" },
      /** Explore tab, This week view: screen readers' name for the row of three leaderboard tabs */
      leaderboards: { en: "This week\u2019s leaderboards", ja: "\u4ECA\u9031\u306E\u30E9\u30F3\u30AD\u30F3\u30B0" },
      /** A leaderboard nobody is on: a supporting note in place of the rows, saying so and how to get on. */
      empty: {
        /** Explore tab, This week view, Most gratitude leaderboard with no one on it: the note in place of the rows */
        mostGratitude: {
          en: "No one is on it yet this week. Give someone a sticker: the gratitude they send back counts here.",
          ja: "\u4ECA\u9031\u306F\u307E\u3060\u8AB0\u3082\u30E9\u30F3\u30AF\u30A4\u30F3\u3057\u3066\u3044\u307E\u305B\u3093\u3002\u30B7\u30FC\u30EB\u3092\u8D08\u308B\u3068\u3001\u76F8\u624B\u304C\u9001\u3063\u3066\u304F\u308C\u305F\u611F\u8B1D\u304C\u3053\u3053\u306B\u6570\u3048\u3089\u308C\u307E\u3059\u3002"
        },
        /** Explore tab, This week view, Best combo leaderboard with no one on it: the note in place of the rows */
        bestCombo: {
          en: "No one is on it yet this week. Receive a sticker and send gratitude: your best combo counts here.",
          ja: "\u4ECA\u9031\u306F\u307E\u3060\u8AB0\u3082\u30E9\u30F3\u30AF\u30A4\u30F3\u3057\u3066\u3044\u307E\u305B\u3093\u3002\u30B7\u30FC\u30EB\u3092\u53D7\u3051\u53D6\u3063\u3066\u611F\u8B1D\u3092\u9001\u308B\u3068\u3001\u6700\u9AD8\u30B3\u30F3\u30DC\u304C\u3053\u3053\u306B\u8F09\u308A\u307E\u3059\u3002"
        },
        /** Explore tab, This week view, Streak leaderboard with no one on it: the note in place of the rows */
        longestStreak: {
          en: "No one has a streak going. Seal a sticker today to start yours.",
          ja: "\u9023\u7D9A\u3057\u3066\u3044\u308B\u4EBA\u306F\u307E\u3060\u3044\u307E\u305B\u3093\u3002\u4ECA\u65E5\u30B7\u30FC\u30EB\u3092\u4ED5\u4E0A\u3052\u308B\u3068\u3001\u9023\u7D9A\u65E5\u6570\u304C\u306F\u3058\u307E\u308A\u307E\u3059\u3002"
        }
      }
    },
    /** The leaderboards' names: their tabs on a phone, and the label over each board on an iPad. */
    leaderboards: {
      /** Explore tab, This week view: the first board, ranking people by the gratitude they earned this week; its tab on a phone, the label over its board on an iPad */
      mostGratitude: { en: "Most gratitude", ja: "\u611F\u8B1D\u306E\u6570" },
      /** Explore tab, This week view: the second board, ranking people by the most hits in one gratitude combo this week; its tab on a phone, the label over its board on an iPad */
      bestCombo: { en: "Best combo", ja: "\u6700\u9AD8\u30B3\u30F3\u30DC" },
      /** Explore tab, This week view: the third board, ranking people by their current streak of days sealing a sticker; its tab on a phone, the label over its board on an iPad */
      longestStreak: { en: "Streak", ja: "\u9023\u7D9A\u65E5\u6570" }
    },
    /** A leaderboard row's figure. A unit in <small> is set small beside its number. */
    figure: {
      /** Explore tab, Most gratitude leaderboard: the figure at the end of each row, that person's gratitude this week; the <hidden> words are for screen readers only */
      gratitude: {
        en: "{{amount}}<hidden> gratitude</hidden>",
        ja: "<hidden>\u611F\u8B1D</hidden>{{amount}}"
      },
      /** Explore tab, Streak leaderboard: the figure at the end of a row whose streak is one day, the unit set small */
      streak_one: { en: "{{count}}<small>day</small>" },
      /** Explore tab, Streak leaderboard: the figure at the end of each row, that person's streak in days, the unit set small */
      streak_other: { en: "{{count}}<small>days</small>", ja: "{{count}}<small>\u65E5</small>" },
      /** Explore tab, Streak leaderboard: what screen readers say in place of the figure when the streak is one day */
      streakSpoken_one: { en: "{{count}} day" },
      /** Explore tab, Streak leaderboard: what screen readers say in place of the figure, that person's streak in days */
      streakSpoken_other: { en: "{{count}} days", ja: "{{count}}\u65E5" }
    },
    failed: {
      /** Explore tab, when it fails to load: the alert, before Try again; {{reason}} is why */
      explore: {
        en: "Couldn\u2019t load Explore: {{reason}}",
        ja: "\u300C\u767A\u898B\u300D\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
      },
      /** Explore tab, when a search fails to load: the alert, before Try again; {{reason}} is why */
      searchResults: {
        en: "Couldn\u2019t load search results: {{reason}}",
        ja: "\u691C\u7D22\u7D50\u679C\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
      }
    },
    /** A sticker lifted off the pile into a sheet. {{artist}} is its artist's @handle, or LINE name. */
    lifted: {
      /** Explore tab, lifted sticker: screen readers' name for the sheet, the sticker's number and who drew it */
      label: { en: "{{no}} by {{artist}}", ja: "{{artist}}\u3055\u3093\u306E{{no}}" },
      /** Explore tab, lifted sticker: fine print under the artist chip: the number, drawing time and the day it was sealed */
      caption: {
        en: "{{no}} \xB7 <duration/> \xB7 {{day}}",
        ja: "{{no}}\u30FB<wbr/><duration/>\u30FB<wbr/>{{day}}"
      },
      /** Explore tab, lifted sticker: the same fine print for a sticker someone was given; <receiver/> is their @handle */
      captionGiven: {
        en: "{{no}} \xB7 <duration/> \xB7 {{day}} \xB7 to <receiver/>",
        ja: "{{no}}\u30FB<wbr/><duration/>\u30FB<wbr/>{{day}}\u30FB<wbr/><receiver/>\u3055\u3093\u3078"
      },
      /** Explore tab, lifted sticker: label stock under the fine print that opens the artist's sticker board */
      goToBoard: { en: "Go to {{artist}}\u2019s sticker board", ja: "{{artist}}\u3055\u3093\u306E\u30B7\u30FC\u30EB\u30DC\u30FC\u30C9\u3078" },
      /** Explore tab, lifted sticker: the quiet link at the sheet's foot that puts the sticker back on the pile */
      putBack: { en: "Put back", ja: "\u623B\u3059" },
      /** Explore tab, lifted sticker: screen readers' name for the small arrow left of the sticker, which lifts the one before it */
      previous: { en: "Previous sticker", ja: "\u524D\u306E\u30B7\u30FC\u30EB" },
      /** Explore tab, lifted sticker: screen readers' name for the small arrow right of the sticker, which lifts the one after it */
      next: { en: "Next sticker", ja: "\u6B21\u306E\u30B7\u30FC\u30EB" },
      /** Explore tab, lifted sticker: what screen readers hear on paging: the sticker, its artist and where it is in the pile */
      shown: {
        en: "{{no}} by {{artist}}, {{position}} of {{setSize}}",
        ja: "{{artist}}\u3055\u3093\u306E{{no}}\u3001{{setSize}}\u679A\u4E2D{{position}}\u679A\u76EE"
      }
    }
  };

  // apps/frontend/src/i18n/strings/giving.ts
  var giving = {
    /** Giving recovery: a stale selection returned an existing gift addressed to someone else */
    recipientMismatch: {
      en: "This sticker is already in a gift with a different recipient. Its original recipient is unchanged. To choose someone new, take it out, then give it again.",
      ja: "\u3053\u306E\u30B7\u30FC\u30EB\u306F\u3059\u3067\u306B\u5225\u306E\u8D08\u308A\u5148\u3078\u306E\u30AE\u30D5\u30C8\u306B\u306A\u3063\u3066\u3044\u307E\u3059\u3002\u5143\u306E\u8D08\u308A\u5148\u306F\u5909\u308F\u3063\u3066\u3044\u307E\u305B\u3093\u3002\u5225\u306E\u4EBA\u306B\u8D08\u308B\u306B\u306F\u3001\u53D6\u308A\u51FA\u3057\u3066\u304B\u3089\u3082\u3046\u4E00\u5EA6\u8D08\u3063\u3066\u304F\u3060\u3055\u3044\u3002"
    },
    tag: {
      /** The gift tag's small label over the giver's handle, on the gift bag in Giving and in the gift a recipient opens, and before the handle in the Gift Message sent through LINE ("From @alice") */
      from: { en: "From", ja: "\u8D08\u308A\u4E3B" },
      /** The gift tag's small label over the recipient's handle, on the gift bag in Giving when the giver picked the person from their sticker board ("For @bob") */
      for: { en: "For", ja: "\u8D08\u308A\u5148" }
    },
    /** Why a packed gift can't go out, by cause: the reason in “couldn’t be packed” on Giving's “Not sent yet” screen, with the developer's English detail after it in brackets */
    transferProblem: {
      /** Giving, throughout recovery: persistent warning when device storage cannot read or save LINE's outcome. */
      storage_failed: {
        en: "This device couldn\u2019t read or save LINE\u2019s answer. Your gift is protected on the server; keep this page open until its outcome is recorded.",
        ja: "\u3053\u306E\u7AEF\u672B\u3067LINE\u306E\u7D50\u679C\u3092\u8AAD\u307F\u8FBC\u3080\u304B\u4FDD\u5B58\u3059\u308B\u3053\u3068\u304C\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u30AE\u30D5\u30C8\u306F\u30B5\u30FC\u30D0\u30FC\u3067\u4FDD\u8B77\u3055\u308C\u3066\u3044\u307E\u3059\u3002\u7D50\u679C\u304C\u8A18\u9332\u3055\u308C\u308B\u307E\u3067\u3001\u3053\u306E\u753B\u9762\u3092\u958B\u3044\u305F\u307E\u307E\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
      },
      /** Giving's “Not sent yet” screen, in “couldn’t be packed”: the gift has no link to send; taking the sticker out and giving it again makes a new one */
      no_link: {
        en: "This gift came without a link to send. Take the sticker out, then give it again.",
        ja: "\u3053\u306E\u30AE\u30D5\u30C8\u306B\u306F\u9001\u308B\u305F\u3081\u306E\u30EA\u30F3\u30AF\u304C\u3042\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u30B7\u30FC\u30EB\u3092\u53D6\u308A\u51FA\u3057\u3066\u304B\u3089\u3001\u3082\u3046\u4E00\u5EA6\u8D08\u3063\u3066\u304F\u3060\u3055\u3044\u3002"
      }
    },
    giftMessage: {
      /** The Gift Message sent through LINE: its preview in the recipient's chat list and LINE's notification */
      altText: { en: "{{name}} sent you a sticker", ja: "{{name}}\u3055\u3093\u304B\u3089\u30B7\u30FC\u30EB\u304C\u5C4A\u304D\u307E\u3057\u305F" },
      /** The Gift Message sent through LINE: the fine print after the sticker's number ("NO.0147 · ONE OF A KIND") */
      oneOfAKind: { en: "ONE OF A KIND", ja: "\u4E00\u70B9\u3082\u306E" },
      /** The Gift Message sent through LINE: the line under "From @alice", with the sticker's drawing time */
      body: {
        en: "A one-of-a-kind sticker, drawn in {{duration}}. It opens once.",
        ja: "{{duration}}\u3067\u304B\u3044\u305F\u3001\u4E00\u70B9\u3082\u306E\u306E\u30B7\u30FC\u30EB\u3067\u3059\u3002\u3072\u3089\u3051\u308B\u306E\u306F\u4E00\u5EA6\u3060\u3051\u3067\u3059\u3002"
      },
      /** The Gift Message sent through LINE: its button, which opens the gift in the app */
      open: { en: "Open your gift", ja: "\u30AE\u30D5\u30C8\u3092\u3072\u3089\u304F" }
    },
    /** The give sheet on someone else's sticker board: its key once a sticker is picked ("Give No.0147") */
    give: { en: "Give {{no}}", ja: "{{no}}\u3092\u8D08\u308B" },
    /** Giving from someone else's sticker board: picking one of yours first. */
    giveSheet: {
      /** The give sheet, opened by Give on someone else's sticker board: its title */
      title: { en: "Give {{name}} a sticker", ja: "{{name}}\u3055\u3093\u306B\u30B7\u30FC\u30EB\u3092\u8D08\u308B" },
      /** The give sheet on someone else's sticker board: the name of the grid of your stickers, for assistive tech */
      yourStickers: { en: "Your stickers", ja: "\u3042\u306A\u305F\u306E\u30B7\u30FC\u30EB" },
      /** The give sheet on someone else's sticker board: in the grid's place when you have no sticker to give */
      none: {
        en: "You don\u2019t have a sticker to give yet. Draw one on your board first.",
        ja: "\u8D08\u308C\u308B\u30B7\u30FC\u30EB\u304C<wbr/>\u307E\u3060<wbr/>\u3042\u308A\u307E\u305B\u3093\u3002<wbr/>\u307E\u305A\u306F<wbr/>\u30B7\u30FC\u30EB\u30DC\u30FC\u30C9\u3067<wbr/>1\u679A<wbr/>\u304B\u3044\u3066\u307F\u307E\u3057\u3087\u3046\u3002"
      },
      /** The give sheet on someone else's sticker board: an alert when LINE's friend picker can't open there, such as outside LINE */
      noPicker: {
        en: "LINE\u2019s friend picker isn\u2019t available here, so gifts can\u2019t be sent from this screen.",
        ja: "\u3053\u3053\u3067\u306FLINE\u306E\u53CB\u3060\u3061\u9078\u629E\u304C\u4F7F\u3048\u306A\u3044\u305F\u3081\u3001\u3053\u306E\u753B\u9762\u304B\u3089\u306F\u30AE\u30D5\u30C8\u3092\u9001\u308C\u307E\u305B\u3093\u3002"
      },
      /** The give sheet on someone else's sticker board: its key, disabled, until you pick a sticker */
      pick: { en: "Pick a sticker", ja: "\u30B7\u30FC\u30EB\u3092\u9078\u3076" }
    },
    /** Giving an NSFW sticker, which only someone with Show 18+ stickers on can receive. */
    nsfw: {
      /** The give sheet on someone else's sticker board: said by assistive tech on an NSFW sticker that can't be picked because they haven't turned on Show 18+ stickers */
      blocked: {
        en: "18+, can\u2019t be given to them",
        ja: "18+\u306E\u305F\u3081\u3001\u3053\u306E\u4EBA\u306B\u306F\u8D08\u308C\u307E\u305B\u3093"
      },
      /** The give sheet on someone else's sticker board: fine print under the grid when some of your stickers are NSFW and <name/> hasn't turned on Show 18+ stickers; <name/> is their handle, which keeps its own case in the capitals */
      notOptedIn: {
        en: "18+ stickers only go to people who turned on Show 18+ stickers, and <name/> hasn\u2019t.",
        ja: "18+\u306E\u30B7\u30FC\u30EB\u306F\u3001<wbr/>\u300C18+\u306E\u30B7\u30FC\u30EB\u3092\u8868\u793A\u3059\u308B\u300D\u3092<wbr/>\u30AA\u30F3\u306B\u3057\u305F\u4EBA\u306B\u3060\u3051<wbr/>\u8D08\u308C\u307E\u3059\u3002<wbr/><name/>\u3055\u3093\u306F<wbr/>\u30AA\u30F3\u306B\u3057\u3066\u3044\u307E\u305B\u3093\u3002"
      },
      /** Giving, for an NSFW sticker: fine print at the foot of the open gift bag's screens, from Preparing your gift on, on who can open the gift */
      whoCanOpen: {
        en: "18+ sticker: only someone who turned on Show 18+ stickers can open this gift.",
        ja: "18+\u306E\u30B7\u30FC\u30EB\uFF1A<wbr/>\u300C18+\u306E\u30B7\u30FC\u30EB\u3092\u8868\u793A\u3059\u308B\u300D\u3092<wbr/>\u30AA\u30F3\u306B\u3057\u305F\u4EBA\u3060\u3051\u304C<wbr/>\u3053\u306E\u30AE\u30D5\u30C8\u3092<wbr/>\u3072\u3089\u3051\u307E\u3059\u3002"
      }
    },
    /** Giving: the sticker's fine print over the sheet, its number, drawing time, seal day and the giver's handle */
    meta: {
      en: "{{no}} \xB7 <duration/> \xB7 {{day}} \xB7 <name/>",
      ja: "{{no}}\u30FB<duration/>\u30FB{{day}}\u30FB<name/>"
    },
    /** "Can’t find them?", in Not sent yet's place: for a friend LINE's picker leaves out. */
    cantFind: {
      /** Giving's "Not sent yet" screen: the quiet link under Send in LINE; and the title of the screen it opens in the sheet */
      title: { en: "Can\u2019t find them?", ja: "\u76F8\u624B\u304C\u898B\u3064\u304B\u3089\u306A\u3044\uFF1F" },
      /** Giving's "Can't find them?" screen: the back arrow's name for assistive tech, which goes back to Not sent yet */
      back: { en: "Back", ja: "\u623B\u308B" },
      /** Giving's "Can't find them?" screen: the line under its title, on who LINE's friend picker leaves out */
      lead: {
        en: "LINE\u2019s list leaves out anyone who turned off sharing with apps, and friends you added in the last few minutes.",
        ja: "LINE\u306E\u4E00\u89A7\u306B\u306F\u3001<wbr/>\u30A2\u30D7\u30EA\u3068\u306E<wbr/>\u5171\u6709\u3092<wbr/>\u30AA\u30D5\u306B\u3057\u3066\u3044\u308B\u4EBA\u3068\u3001<wbr/>\u3053\u3053\u6570\u5206\u3067<wbr/>\u8FFD\u52A0\u3057\u305F\u53CB\u3060\u3061\u306F<wbr/>\u8868\u793A\u3055\u308C\u307E\u305B\u3093\u3002"
      },
      /** Giving's "Can't find them?" screen: the bold title of the row that opens LINE's Add friends screen */
      notFriends: { en: "Not friends in LINE yet?", ja: "\u307E\u3060LINE\u306E\u53CB\u3060\u3061\u3067\u306F\u306A\u3044\uFF1F" },
      /** Giving's "Can't find them?" screen: the small line under "Not friends in LINE yet?" */
      notFriendsHint: {
        en: "Add them in LINE first and say hi. Then come back and pick them.",
        ja: "\u307E\u305ALINE\u3067\u53CB\u3060\u3061\u306B\u8FFD\u52A0\u3057\u3066\u3001\u3042\u3044\u3055\u3064\u3057\u307E\u3057\u3087\u3046\u3002\u305D\u308C\u304B\u3089\u623B\u3063\u3066\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002"
      },
      /** Giving's "Can't find them?" screen: an alert when tapping "Not friends in LINE yet?" fails to open LINE's Add friends screen, over LINE's own English words for a report */
      addFriendsDidntOpen: {
        en: "LINE\u2019s Add friends screen didn\u2019t open.",
        ja: "LINE\u306E\u53CB\u3060\u3061\u8FFD\u52A0\u753B\u9762\u304C\u3072\u3089\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002"
      }
    },
    preparing: {
      /** Giving, as Give opens it: the sheet's title while the sticker goes into the gift bag, before LINE's friend picker opens */
      title: { en: "Preparing your gift", ja: "\u30AE\u30D5\u30C8\u3092\u6E96\u5099\u4E2D" },
      /** Giving's “Preparing your gift” screen: the send key's label while the sticker is being prepared */
      button: { en: "Preparing\u2026", ja: "\u6E96\u5099\u4E2D\u2026" },
      /** What a long wait is waiting on, by step: the line under “Preparing your gift” once it has run long. */
      slow: {
        /** Giving's “Preparing your gift” screen, after about ten seconds: the line under its title, while Croquis hasn't answered */
        asking: {
          en: "This is taking longer than usual. Still waiting for Croquis to answer.",
          ja: "\u3044\u3064\u3082\u3088\u308A<wbr/>\u6642\u9593\u304C<wbr/>\u304B\u304B\u3063\u3066\u3044\u307E\u3059\u3002<wbr/>\u30AF\u30ED\u30C3\u30AD\u30FC\u304B\u3089\u306E<wbr/>\u5FDC\u7B54\u3092<wbr/>\u5F85\u3063\u3066\u3044\u307E\u3059\u3002"
        },
        /** Giving's “Preparing your gift” screen, after about ten seconds: the line under its title, while the sticker goes into the gift bag */
        moving: {
          en: "This is taking longer than usual. Your sticker is still going into the gift bag.",
          ja: "\u3044\u3064\u3082\u3088\u308A<wbr/>\u6642\u9593\u304C<wbr/>\u304B\u304B\u3063\u3066\u3044\u307E\u3059\u3002<wbr/>\u30B7\u30FC\u30EB\u3092<wbr/>\u30AE\u30D5\u30C8\u888B\u306B<wbr/>\u5165\u308C\u3066\u3044\u308B\u3068\u3053\u308D\u3067\u3059\u3002"
        },
        /** Giving's “Preparing your gift” screen, after about ten seconds: the sentence after what it waits on, since Take it out is offered now */
        leave: {
          en: "Nothing is sent until you pick a chat. You can take the sticker out to start over.",
          ja: "\u30C8\u30FC\u30AF\u3092<wbr/>\u9078\u3076\u307E\u3067\u3001<wbr/>\u4F55\u3082<wbr/>\u9001\u3089\u308C\u307E\u305B\u3093\u3002<wbr/>\u30B7\u30FC\u30EB\u3092<wbr/>\u53D6\u308A\u51FA\u3057\u3066\u3001<wbr/>\u6700\u521D\u304B\u3089<wbr/>\u3084\u308A\u76F4\u3059\u3053\u3068\u3082<wbr/>\u3067\u304D\u307E\u3059\u3002"
        },
        /** Giving's “Preparing your gift” screen, after about ten seconds: the line under its title, joining what it waits on to the sentence after it */
        lead: { en: "{{waiting}} {{leave}}", ja: "{{waiting}}<wbr/>{{leave}}" }
      }
    },
    /** Giving, when the sheet moves to a new step: what screen readers hear, its title and then the line under it */
    stepHeard: { en: "{{title}}. {{lead}}", ja: "{{title}}\u3002{{lead}}" },
    /** The sticker lifting back out of the bag after Take it out. */
    takingOut: {
      /** Giving, while the sticker comes back out of the gift bag after Take it out: the sheet's title */
      title: { en: "Taking it out", ja: "\u53D6\u308A\u51FA\u3057\u4E2D" },
      /** Giving's “Taking it out” screen: the line under its title */
      lead: {
        en: "Your sticker is coming back out of the gift bag. This can take a minute or two.",
        ja: "\u30B7\u30FC\u30EB\u3092<wbr/>\u30AE\u30D5\u30C8\u888B\u304B\u3089<wbr/>\u53D6\u308A\u51FA\u3057\u3066\u3044\u307E\u3059\u3002<wbr/>\u6570\u5206<wbr/>\u304B\u304B\u308B\u3053\u3068\u3082<wbr/>\u3042\u308A\u307E\u3059\u3002"
      },
      /** Giving's “Taking it out” screen: the send key's label while the sticker comes out; and the sticker detail of a sticker in a gift: Take it out's words while it runs */
      button: { en: "Taking it out\u2026", ja: "\u53D6\u308A\u51FA\u3057\u4E2D\u2026" }
    },
    /** The sticker in the open bag, until it's sent or taken out. */
    inTheBag: {
      /** Giving, once the sticker drops into the open gift bag: the sheet's title while LINE's friend picker opens and is up; and the sticker detail of a sticker in a packed gift: its note */
      title: { en: "In the bag", ja: "\u30AE\u30D5\u30C8\u888B\u306B\u5165\u308C\u307E\u3057\u305F" },
      /** Giving, with the sticker in the open gift bag: the line under "In the bag" */
      lead: {
        en: "The bag closes when it\u2019s sent. Pick your chat with them in LINE: whoever opens it first gets it.",
        ja: "\u9001\u308B\u3068<wbr/>\u888B\u306B<wbr/>\u5C01\u304C\u3055\u308C\u307E\u3059\u3002<wbr/>LINE\u3067<wbr/>\u76F8\u624B\u3068\u306E<wbr/>\u30C8\u30FC\u30AF\u3092<wbr/>\u9078\u3093\u3067\u304F\u3060\u3055\u3044\u3002<wbr/>\u6700\u521D\u306B<wbr/>\u3072\u3089\u3044\u305F\u4EBA\u304C<wbr/>\u53D7\u3051\u53D6\u308C\u307E\u3059\u3002"
      },
      /** Giving, after LINE's friend picker closed without sending, or a step failed: the sheet's title over the open gift bag */
      notSent: { en: "Not sent yet", ja: "\u307E\u3060\u9001\u3063\u3066\u3044\u307E\u305B\u3093" },
      /** Giving's "Not sent yet" screen: the line under its title */
      notSentLead: {
        en: "It\u2019s still in the open bag. Pick a chat again, or take it out.",
        ja: "\u5C01\u3092\u3057\u306A\u3044\u307E\u307E\u3001<wbr/>\u307E\u3060<wbr/>\u888B\u306E\u4E2D\u306B<wbr/>\u3042\u308A\u307E\u3059\u3002<wbr/>\u3082\u3046\u4E00\u5EA6<wbr/>\u30C8\u30FC\u30AF\u3092<wbr/>\u9078\u3076\u304B\u3001<wbr/>\u53D6\u308A\u51FA\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
      },
      /** Giving, with the sticker in the open gift bag: the aqua key that opens LINE's friend picker (again) */
      send: { en: "Send in LINE", ja: "LINE\u3067\u9001\u308B" },
      /** Giving, with the sticker in the open gift bag: the quiet link under Send in LINE that lifts it back out and closes Giving; and the sticker detail of a sticker in a gift: the quiet link under its note, and its confirm's key */
      takeOut: { en: "Take it out", ja: "\u53D6\u308A\u51FA\u3059" },
      /** Giving's "Not sent yet" screen: an alert when Croquis couldn't pack the gift, with why */
      couldntPack: {
        en: "{{no}} couldn\u2019t be packed: {{reason}}",
        ja: "{{no}}\u3092\u30AE\u30D5\u30C8\u888B\u306B\u5165\u308C\u3089\u308C\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
      },
      /** Giving's "Not sent yet" screen: an alert when LINE's friend picker failed to send the Gift Message, with why */
      wasntSent: { en: "{{no}} wasn\u2019t sent: {{reason}}", ja: "{{no}}\u3092\u9001\u308C\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}" },
      /** Giving's "Not sent yet" screen: an alert when Take it out failed, with why; and the sticker detail of a sticker in a gift: the alert under its note, with Try again and Dismiss */
      couldntTakeOut: {
        en: "{{no}} couldn\u2019t be taken out: {{reason}}",
        ja: "{{no}}\u3092\u53D6\u308A\u51FA\u305B\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
      },
      /** Giving's "Not sent yet" screen: an alert when Croquis couldn't record a cancelled or failed send, with why */
      couldntRecord: {
        en: "Croquis couldn\u2019t record that: {{reason}}",
        ja: "\u30AF\u30ED\u30C3\u30AD\u30FC\u306B\u8A18\u9332\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
      }
    },
    /** LINE didn't say whether the Gift Message went out, so the same one isn't offered again. */
    maybeSent: {
      /** Giving, when LINE's friend picker gave no answer on whether the Gift Message went out: the sheet's title over the open gift bag */
      title: { en: "Did it go out?", ja: "\u9001\u308C\u307E\u3057\u305F\u304B\uFF1F" },
      /** Giving's "Did it go out?" screen: the line under its title */
      lead: {
        en: "LINE didn\u2019t say whether your gift message went out. If it did, tap It went out. If not, take the sticker out, then give it again.",
        ja: "\u30AE\u30D5\u30C8\u30E1\u30C3\u30BB\u30FC\u30B8\u3092<wbr/>\u9001\u308C\u305F\u304B\u3069\u3046\u304B\u3001<wbr/>LINE\u304B\u3089<wbr/>\u8FD4\u4E8B\u304C<wbr/>\u3042\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002<wbr/>\u9001\u308C\u305F\u5834\u5408\u306F<wbr/>\u300C\u9001\u308C\u307E\u3057\u305F\u300D\u3092<wbr/>\u30BF\u30C3\u30D7\u3057\u3066\u304F\u3060\u3055\u3044\u3002<wbr/>\u9001\u308C\u3066\u3044\u306A\u3044\u5834\u5408\u306F\u3001<wbr/>\u30B7\u30FC\u30EB\u3092<wbr/>\u53D6\u308A\u51FA\u3057\u3066\u304B\u3089\u3001<wbr/>\u3082\u3046\u4E00\u5EA6<wbr/>\u8D08\u3063\u3066\u304F\u3060\u3055\u3044\u3002"
      },
      /** Giving's "Did it go out?" screen: the aqua key the giver taps when the Gift Message did go out in LINE */
      itWentOut: { en: "It went out", ja: "\u9001\u308C\u307E\u3057\u305F" }
    },
    sent: {
      /** Giving, once the Gift Message went out through LINE: the title under the gift bag as it closes */
      title: { en: "Closed and sent", ja: "\u5C01\u3092\u3057\u3066\u9001\u308A\u307E\u3057\u305F" },
      /** Giving's "Closed and sent" screen: the line under its title */
      lead: {
        en: "It\u2019s in your LINE chat now, and the gift message opens once. When they receive it, you\u2019ll see who did.",
        ja: "\u30AE\u30D5\u30C8\u30E1\u30C3\u30BB\u30FC\u30B8\u3092<wbr/>LINE\u306E<wbr/>\u30C8\u30FC\u30AF\u306B<wbr/>\u9001\u308A\u307E\u3057\u305F\u3002<wbr/>\u3072\u3089\u3051\u308B\u306E\u306F<wbr/>\u4E00\u5EA6\u3060\u3051\u3067\u3059\u3002<wbr/>\u53D7\u3051\u53D6\u3089\u308C\u305F\u3089\u3001<wbr/>\u8AB0\u304C<wbr/>\u53D7\u3051\u53D6\u3063\u305F\u304B\u304C<wbr/>\u308F\u304B\u308A\u307E\u3059\u3002"
      },
      /** Giving's "Closed and sent" screen: an alert when the Gift Message went out but Croquis couldn't record it, with why */
      couldntRecord: {
        en: "It went out in LINE, but Croquis couldn\u2019t record it: {{reason}}",
        ja: "LINE\u3067\u306F\u9001\u308C\u307E\u3057\u305F\u304C\u3001\u30AF\u30ED\u30C3\u30AD\u30FC\u306B\u8A18\u9332\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
      }
    },
    /** The frosted gift bag. */
    giftBag: {
      /** Names the bag's picture for assistive tech, by its state. */
      pictured: {
        /** The gift bag's picture named for assistive tech: in Giving, with the sticker in the open bag */
        open: { en: "The sticker in an open gift bag", ja: "\u53E3\u306E\u3042\u3044\u305F\u30AE\u30D5\u30C8\u888B\u306B\u5165\u3063\u305F\u30B7\u30FC\u30EB" },
        /** The gift bag's picture named for assistive tech, closed: Giving's "Closed and sent" screen, and a gift that can't be received yet or here */
        closed: { en: "The gift bag, closed", ja: "\u5C01\u3092\u3057\u305F\u30AE\u30D5\u30C8\u888B" },
        /** The gift bag's picture named for assistive tech: in the gift a recipient opens, once they've torn it open */
        torn: { en: "The gift bag, torn open", ja: "\u7834\u3063\u3066\u3072\u3089\u3044\u305F\u30AE\u30D5\u30C8\u888B" },
        /** The gift bag's picture named for assistive tech: a gift that can't be received because it was already opened, taken back or returned */
        opened: { en: "The gift bag, open and empty", ja: "\u53E3\u304C\u3042\u3044\u3066\u7A7A\u306B\u306A\u3063\u305F\u30AE\u30D5\u30C8\u888B" }
      },
      /** The gift bag's picture named for assistive tech, for an NSFW sticker's pink bag: {{pictured}} is the bag's state, as above */
      nsfw: { en: "{{pictured}}, pink, marked 18+", ja: "{{pictured}}\uFF08\u30D4\u30F3\u30AF\u300118+\uFF09" },
      /** The gift bag's picture named for assistive tech, with its tag's words after the bag's ("…, tagged From @alice") */
      tagged: {
        en: "{{pictured}}, tagged {{label}} {{name}}",
        ja: "{{pictured}}\u3001\u30BF\u30B0\u306B\u300C{{label}} {{name}}\u300D"
      },
      /** The gift bag's picture named for assistive tech, with its tag's words and the rubber stamp on the tag, on a gift that can't be received */
      taggedAndStamped: {
        en: "{{pictured}}, tagged {{label}} {{name}}, stamped {{stamp}}",
        ja: "{{pictured}}\u3001\u30BF\u30B0\u306B\u300C{{label}} {{name}}\u300D\u3001\u306F\u3093\u3053\u306B\u300C{{stamp}}\u300D"
      },
      /** The closed gift bag, in Giving's "Closed and sent" screen and in a gift a recipient opens: printed again and again along the aqua tear tape, with the day it was closed ("CLOSED 9.23") */
      closed: { en: "<b>Closed</b> {{date}}", ja: "<b>\u5C01\u5370</b>{{date}}" },
      /** The gift a recipient opens: the pull tab's name for assistive tech, as a slider */
      pullTab: { en: "Pull the tab to open the gift", ja: "\u3064\u307E\u307F\u3092\u5F15\u3044\u3066\u30AE\u30D5\u30C8\u3092\u3072\u3089\u304F" },
      /** The gift bag: printed on the pull tab, beside its grip ribs */
      pull: { en: "Pull", ja: "\u5F15\u304F" },
      /** The rubber stamps inked on the tag, by stamp: big words, some under a small line. */
      stamps: {
        "one-to-one": {
          /** The rubber stamp on the tag of a gift opened in a group chat: its small top line, over "1:1 chat" */
          small: { en: "Opens only in", ja: "\u3072\u3089\u3051\u308B\u306E\u306F" },
          /** The rubber stamp on the tag of a gift opened in a group chat: its big words, under "Opens only in" */
          big: { en: "1:1 chat", ja: "1:1\u30C8\u30FC\u30AF" }
        },
        opened: {
          /** The rubber stamp on the tag of a gift someone already opened */
          big: { en: "Opened", ja: "\u958B\u5C01\u6E08\u307F" }
        },
        "taken-back": {
          /** The rubber stamp on the tag of a gift its giver took back before anyone received it */
          big: { en: "Taken back", ja: "\u53D6\u308A\u6D88\u3057" }
        },
        returned: {
          /** The rubber stamp on the tag of a gift that went back to its giver, unopened in time */
          big: { en: "Returned", ja: "\u8FD4\u9001\u6E08\u307F" }
        },
        nsfw: {
          /** The rubber stamp on the tag of an NSFW sticker's gift, opened by someone who hasn't turned on Show 18+ stickers */
          big: { en: "18+ only", ja: "18\u6B73\u4EE5\u4E0A" }
        }
      }
    },
    /** The giver's moment once a gift is received. */
    receivedNotice: {
      /** The giver's received notice, over the whole phone on their sticker board once someone received their gift: its title. The Gratitude heart follows it. */
      title: {
        en: "{{name}} received your sticker",
        ja: "{{name}}\u3055\u3093\u304C\u3042\u306A\u305F\u306E\u30B7\u30FC\u30EB\u3092\u53D7\u3051\u53D6\u308A\u307E\u3057\u305F"
      },
      /** The giver's received notice: the line under its title */
      lead: {
        en: "It\u2019s on {{name}}\u2019s sticker board now.",
        ja: "\u3044\u307E\u306F{{name}}\u3055\u3093\u306E\u30B7\u30FC\u30EB\u30DC\u30FC\u30C9\u306B\u3042\u308A\u307E\u3059\u3002"
      },
      /** The giver's received notice: the caption beside the sticker's silhouette, the receiver and the day they received it */
      caption: { en: "{{name}} \xB7 {{date}}", ja: "{{name}}\u30FB{{date}}" }
    }
  };

  // apps/frontend/src/i18n/strings/gratitude.ts
  var gratitude = {
    /** Gratitude Mini-game, which covers the phone when you send gratitude for a received sticker: the page title in LINE's header while it's open, and screen readers' name for the game */
    title: { en: "Send gratitude", ja: "\u611F\u8B1D\u3092\u9001\u308B" },
    /** Gratitude Mini-game, top left: screen readers' name for the sticker the gratitude is for, with its number */
    sticker: { en: "Sticker {{no}}", ja: "\u30B7\u30FC\u30EB{{no}}" },
    /** Gratitude Mini-game, top: fine print over the giver's handle, beside their photo */
    from: { en: "From", ja: "\u8D08\u308A\u4E3B" },
    /** Gratitude Mini-game, top right, before the first tap or once the ending has played: screen readers' name for the X button that closes the game */
    close: { en: "Close", ja: "\u9589\u3058\u308B" },
    /** Gratitude Mini-game, top right, once the combo is running: screen readers' name for the X button, which ends the combo, sends it and shows its receipt */
    endAndSend: { en: "End and send gratitude", ja: "\u3053\u3053\u3067\u7D42\u3048\u3066\u611F\u8B1D\u3092\u9001\u308B" },
    /** Gratitude Mini-game: screen readers' name for the big heart's button, which you tap to play */
    heart: { en: "Send gratitude to {{handle}}", ja: "{{handle}}\u3055\u3093\u306B\u611F\u8B1D\u3092\u9001\u308B" },
    /** Gratitude Mini-game, before the first tap: the hint under the heart, on two lines, beating like a game's start button */
    hint: { en: "Tap the heart<br/>as fast as you can!", ja: "\u3067\u304D\u308B\u3060\u3051\u901F\u304F<br/>\u30CF\u30FC\u30C8\u3092\u30BF\u30C3\u30D7\uFF01" },
    /** What to do, shown and said once the person is trying. */
    tips: {
      /** Gratitude Mini-game, after three drags across the heart that didn't start stroking: a tip label with a swipe icon, also said to screen readers */
      stroke: { en: "Stroke it back and forth, fast", ja: "\u884C\u3063\u305F\u308A\u6765\u305F\u308A\u3001\u3059\u3070\u3084\u304F\u306A\u3067\u3066" },
      /** Gratitude Mini-game, during a hard shake of the phone, before shaking counts as hits: a tip label with a vibrate icon, also said to screen readers */
      shake: { en: "Keep shaking!", ja: "\u305D\u306E\u307E\u307E\u632F\u308A\u7D9A\u3051\u3066\uFF01" }
    },
    /** Gratitude Mini-game, as the combo ends: the sigh that drifts up over where the heart was, beside a wind icon */
    sigh: { en: "fuu\u2026", ja: "\u3075\u3045\u2026" },
    hud: {
      /** Gratitude Mini-game, the timer bar at the top: the unit after the seconds left */
      secondsUnit: { en: "s", ja: "\u79D2" },
      /** Gratitude Mini-game, the timer bar at the top: a label that rises over the bar's end as a hit lands, the seconds the hit added */
      secondsAdded: { en: "+{{seconds}}s", ja: "+{{seconds}}\u79D2" }
    },
    /** Said through the screen's polite live region, for assistive tech. */
    announcements: {
      /** Gratitude Mini-game, screen readers only: said as the first tap starts the timer bar */
      keepTapping: {
        en: "Keep tapping before the bar runs out.",
        ja: "\u30D0\u30FC\u304C\u306A\u304F\u306A\u308B\u524D\u306B\u3001\u30BF\u30C3\u30D7\u3092\u7D9A\u3051\u3066\u304F\u3060\u3055\u3044\u3002"
      },
      /** Gratitude Mini-game, screen readers only: said on a hit at most every 1.6 seconds, the combo's gratitude so far and its multiplier */
      total: {
        en: "{{total}} gratitude, times {{multiplier}}",
        ja: "\u611F\u8B1D{{total}}\u3001{{multiplier}}\u500D"
      },
      /** Gratitude Mini-game, screen readers only: said when fast back-and-forth strokes on the heart start counting as hits */
      strokeUnlocked: { en: "Stroke unlocked.", ja: "\u306A\u3067\u306A\u3067\u304C\u89E3\u653E\u3055\u308C\u307E\u3057\u305F\u3002" },
      /** Gratitude Mini-game, screen readers only: said when shaking the phone starts counting as hits, with reduced motion on, where the heart stays put */
      shakeUnlocked: { en: "Shake unlocked.", ja: "\u30B7\u30A7\u30A4\u30AF\u304C\u89E3\u653E\u3055\u308C\u307E\u3057\u305F\u3002" },
      /** Gratitude Mini-game, screen readers only: said when shaking the phone starts counting as hits and the heart comes loose to bounce off the screen's edges, with reduced motion off */
      heartLoose: { en: "The heart is loose.", ja: "\u30CF\u30FC\u30C8\u304C\u3068\u308C\u3066\u3001\u81EA\u7531\u306B\u52D5\u304D\u3060\u3057\u307E\u3057\u305F\u3002" },
      /** Gratitude Mini-game, screen readers only: said once the receipt is up and the server has the gratitude */
      sent: {
        en: "Sent {{total}} gratitude to {{handle}}.",
        ja: "{{handle}}\u3055\u3093\u306B{{total}}\u306E\u611F\u8B1D\u3092\u9001\u308A\u307E\u3057\u305F\u3002"
      }
    },
    receipt: {
      /** Gratitude Mini-game, once the ending has played and the server has the gratitude: screen readers' name for the receipt card */
      label: { en: "Gratitude sent", ja: "\u611F\u8B1D\u3092\u9001\u308A\u307E\u3057\u305F" },
      /** Gratitude Mini-game, once the ending has played while the gratitude is still going to the server: screen readers' name for the receipt card */
      labelSending: { en: "Sending gratitude", ja: "\u611F\u8B1D\u3092\u9001\u3063\u3066\u3044\u307E\u3059" },
      /** Gratitude Mini-game, once the ending has played when the gratitude couldn't reach the server and waits on this device: screen readers' name for the receipt card */
      labelKept: { en: "Gratitude saved", ja: "\u611F\u8B1D\u3092\u4FDD\u5B58\u3057\u307E\u3057\u305F" },
      /** Gratitude Mini-game, once the ending has played when the gratitude couldn't reach the server and this device couldn't save it: screen readers' name for the receipt card */
      labelLost: { en: "Gratitude not sent or saved", ja: "\u611F\u8B1D\u3092\u9001\u308C\u305A\u3001\u4FDD\u5B58\u3082\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F" },
      /** Gratitude Mini-game, once the ending has played when the server refused the gratitude: screen readers' name for the receipt card */
      labelRefused: { en: "Gratitude not sent", ja: "\u611F\u8B1D\u3092\u9001\u308C\u307E\u305B\u3093\u3067\u3057\u305F" },
      /** Gratitude Mini-game, receipt card: the line under the big gratitude total, naming the giver */
      gratitudeTo: { en: "gratitude to {{handle}}", ja: "{{handle}}\u3055\u3093\u3078\u306E<wbr/>\u611F\u8B1D" },
      /** Gratitude Mini-game, receipt card: fine print beside the hit counter, the combo's best multiplier */
      bestMultiplier: { en: "best \xD7{{multiplier}}", ja: "\u6700\u9AD8\xD7{{multiplier}}" },
      /** Gratitude Mini-game, receipt card, in a note under the combo while the gratitude is still going to the server */
      sending: { en: "Sending\u2026", ja: "\u9001\u3063\u3066\u3044\u307E\u3059\u2026" },
      /** Gratitude Mini-game, receipt card, in a note under the combo when the gratitude couldn't reach the server, also said to screen readers */
      kept: {
        en: "Saved on this device. It goes to {{handle}} when you\u2019re back online.",
        ja: "\u3053\u306E\u7AEF\u672B\u306B\u4FDD\u5B58\u3057\u307E\u3057\u305F\u3002\u63A5\u7D9A\u304C\u623B\u3063\u305F\u3089\u3001{{handle}}\u3055\u3093\u306B\u9001\u308A\u307E\u3059\u3002"
      },
      /** Gratitude Mini-game, receipt card, in a note under the combo when the gratitude couldn't reach the server and this device couldn't save it, also said to screen readers: sending it again is up to the person */
      lost: {
        en: "This combo wasn\u2019t sent, and this device couldn\u2019t save it. Close this and send your gratitude again.",
        ja: "\u4ECA\u56DE\u306E\u611F\u8B1D\u306F\u9001\u3089\u308C\u305A\u3001\u3053\u306E\u7AEF\u672B\u306B\u3082\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u9589\u3058\u3066\u304B\u3089\u3001\u3082\u3046\u4E00\u5EA6\u611F\u8B1D\u3092\u9001\u3063\u3066\u304F\u3060\u3055\u3044\u3002"
      }
    },
    failures: {
      /** Gratitude Mini-game, when the game breaks before the first tap: an alert at the bottom of the screen */
      stopped: {
        en: "The game stopped before your first tap, so nothing was sent. Close it and send your gratitude again.",
        ja: "\u6700\u521D\u306E\u30BF\u30C3\u30D7\u306E\u524D\u306B\u30B2\u30FC\u30E0\u304C\u6B62\u307E\u3063\u3066\u3057\u307E\u3044\u3001\u611F\u8B1D\u306F\u9001\u3089\u308C\u3066\u3044\u307E\u305B\u3093\u3002\u9589\u3058\u3066\u304B\u3089\u3001\u3082\u3046\u4E00\u5EA6\u611F\u8B1D\u3092\u9001\u3063\u3066\u304F\u3060\u3055\u3044\u3002"
      },
      /** Gratitude Mini-game, when the game breaks mid-combo or in its ending and the receipt comes up at once: an alert at the bottom of the screen */
      stoppedInPlay: {
        en: "The game stopped early, so this is your combo up to then.",
        ja: "\u30B2\u30FC\u30E0\u304C\u9014\u4E2D\u3067\u6B62\u307E\u3063\u305F\u305F\u3081\u3001\u305D\u3053\u307E\u3067\u306E\u611F\u8B1D\u306B\u306A\u3063\u3066\u3044\u307E\u3059\u3002"
      }
    },
    /** Why the server refused a combo for good. Each is the receipt card's note under the combo, also said to screen readers, and the gift's sticker detail says it again until dismissed. */
    refusals: {
      /** Gratitude Mini-game, receipt card's note when the gift already has gratitude (gratitude_already_recorded) */
      alreadyRecorded: {
        en: "Gratitude for this sticker is already with {{handle}}, so this combo wasn\u2019t sent.",
        ja: "\u3053\u306E\u30B7\u30FC\u30EB\u3078\u306E\u611F\u8B1D\u306F\u3059\u3067\u306B{{handle}}\u3055\u3093\u306B\u5C4A\u3044\u3066\u3044\u308B\u305F\u3081\u3001\u4ECA\u56DE\u306E\u611F\u8B1D\u306F\u9001\u3089\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002"
      },
      /** Gratitude Mini-game, receipt card's note when someone else received the gift (not_receiver) */
      notReceiver: {
        en: "This sticker was received by someone else, so this combo wasn\u2019t sent.",
        ja: "\u3053\u306E\u30B7\u30FC\u30EB\u3092\u53D7\u3051\u53D6\u3063\u305F\u306E\u306F\u5225\u306E\u4EBA\u306A\u306E\u3067\u3001\u4ECA\u56DE\u306E\u611F\u8B1D\u306F\u9001\u3089\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002"
      },
      /** Gratitude Mini-game, receipt card's note when the server doesn't have the gift as received yet (gift_not_received), which a later combo can fix */
      notReceived: {
        en: "This sticker isn\u2019t marked received yet, so this combo wasn\u2019t sent. Try again once it\u2019s on your board.",
        ja: "\u3053\u306E\u30B7\u30FC\u30EB\u306F\u307E\u3060\u53D7\u3051\u53D6\u308A\u6E08\u307F\u306B\u306A\u3063\u3066\u3044\u306A\u3044\u305F\u3081\u3001\u4ECA\u56DE\u306E\u611F\u8B1D\u306F\u9001\u3089\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u30DC\u30FC\u30C9\u306B\u8CBC\u3089\u308C\u3066\u304B\u3089\u3001\u3082\u3046\u4E00\u5EA6\u9001\u3063\u3066\u304F\u3060\u3055\u3044\u3002"
      },
      /** Gratitude Mini-game, receipt card's note when the gift isn't there (gift_not_found) */
      notFound: {
        en: "This gift isn\u2019t here anymore, so this combo wasn\u2019t sent.",
        ja: "\u3053\u306E\u30AE\u30D5\u30C8\u304C\u898B\u3064\u304B\u3089\u306A\u3044\u305F\u3081\u3001\u4ECA\u56DE\u306E\u611F\u8B1D\u306F\u9001\u3089\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002"
      },
      /** Gratitude Mini-game, receipt card's note, and the sticker detail's until dismissed, when the server couldn't read the combo (replay_invalid, invalid_request), which a new combo can get past */
      unreadable: {
        en: "Croquis couldn\u2019t read your combo, so it wasn\u2019t sent. Send your gratitude again.",
        ja: "\u30AF\u30ED\u30C3\u30AD\u30FC\u304C\u4ECA\u56DE\u306E\u611F\u8B1D\u3092\u8AAD\u307F\u53D6\u308C\u306A\u304B\u3063\u305F\u305F\u3081\u3001\u9001\u3089\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u3082\u3046\u4E00\u5EA6\u611F\u8B1D\u3092\u9001\u3063\u3066\u304F\u3060\u3055\u3044\u3002"
      },
      /** Gratitude Mini-game, receipt card's note for any other refusal, over its details for a report: the server's status, code and English words */
      other: {
        en: "Croquis didn\u2019t accept your gratitude for {{handle}}, so this combo wasn\u2019t sent.",
        ja: "\u30AF\u30ED\u30C3\u30AD\u30FC\u304C{{handle}}\u3055\u3093\u3078\u306E\u611F\u8B1D\u3092\u53D7\u3051\u4ED8\u3051\u306A\u304B\u3063\u305F\u305F\u3081\u3001\u4ECA\u56DE\u306E\u611F\u8B1D\u306F\u9001\u3089\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002"
      }
    }
  };

  // apps/frontend/src/i18n/strings/identity.ts
  var identity = {
    /** The developer slip's Privy account. Never translated. */
    developer: {
      /** An account row's Copy. Mid-sentence, `label` is the row's label in lower case. */
      copy: {
        button: { en: "Copy" },
        ariaLabel: { en: "Copy the {{label}}" },
        copied: { en: "{{label}} copied" },
        failed: { en: "Couldn\u2019t copy the {{label}}. Select it above to copy it by hand." }
      },
      privyId: { en: "Privy ID" },
      suiAddress: {
        label: { en: "Sui address" },
        /** In place of the address, when Privy couldn't make the Sui wallet. */
        failed: { en: "Privy couldn\u2019t make it: {{reason}}" }
      },
      /** An address's link, which opens it on its chain's explorer. */
      onExplorer: { en: "{{label}} {{address}} on {{explorer}}" },
      explorer: {
        suiscan: { en: "Suiscan, Sui Testnet\u2019s explorer" }
      }
    }
  };

  // apps/frontend/src/i18n/strings/kyotoSeika.ts
  var kyotoSeika = {
    /** The five thought clouds over a fresh sheet in Kyoto Seika Manga Expression Practice Mode. */
    balloons: {
      /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: the five thought clouds' group name for screen readers */
      label: { en: "Your subjects", ja: "\u984C\u6750" },
      /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: the hand lettering beside the inked die by the last cloud, and the die's name; a roll deals every subject not picked another */
      reroll: { en: "Reroll", ja: "\u632F\u308A\u76F4\u3057" },
      /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: the sound effect lettered beside the die as it lands, hidden from screen readers; Japanese in both languages, as a drawn manga sound effect */
      rollSound: { en: "\u30B3\u30ED\u30C3", ja: "\u30B3\u30ED\u30C3" },
      /** Drawing screen, a sheet in Kyoto Seika Practice Mode: a subject as screen readers hear it, such as "風, wind": read out politely as a roll deals it, and in English as a cloud's name and in the canvas's name once begun */
      subject: { en: "{{word}}, {{english}}", ja: "{{word}}\u3001{{english}}" },
      /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: the die's name for screen readers once it blew up from rolling too often, and read out as it does; the subjects not picked can't change */
      charred: {
        en: "The die blew up. The subjects stay as they are.",
        ja: "\u30B5\u30A4\u30B3\u30ED\u304C\u7206\u767A\u3057\u307E\u3057\u305F\u3002\u984C\u6750\u306F\u3082\u3046\u5909\u308F\u308A\u307E\u305B\u3093\u3002"
      },
      /** Drawing screen, a sheet in Kyoto Seika Practice Mode: the line in place of the balloons when the subject list didn't load */
      loadFailed: { en: "Couldn\u2019t load the subjects.", ja: "\u984C\u6750\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\u3002" }
    },
    /** The key at the sheet's foot that locks the pair in and starts the clock. */
    begin: {
      /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: the yellow key at the sheet's foot, the proctor's word for starting the test */
      key: { en: "Begin", ja: "\u306F\u3058\u3081" },
      /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: the yellow key's name for screen readers; {{minutes}} is the clock's length */
      label: {
        en: "Begin: start the {{minutes}}-minute timer",
        ja: "\u306F\u3058\u3081\uFF1A{{minutes}}\u5206\u306E\u30BF\u30A4\u30DE\u30FC\u3092\u30B9\u30BF\u30FC\u30C8"
      },
      /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: the sunk yellow key's label and name until two of the five subjects are picked */
      pick: { en: "Pick 2", ja: "2\u3064\u9078\u3076" }
    },
    /** A die rolled again and again teases in manga hand lettering beside its balloon, and at last blows up. */
    tease: {
      /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: hand lettering beside a balloon whose die keeps rolling, its first tease; also read out */
      again: { en: "Eh? Again?", ja: "\u3048\u3048\u3001\u307E\u305F\uFF1F" },
      /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: hand lettering beside a balloon whose die keeps rolling, its second tease; also read out */
      stillDeciding: { en: "Still deciding?", ja: "\u307E\u3060\u6C7A\u3081\u3066\u306A\u3044\u306E\uFF1F" },
      /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: hand lettering beside a balloon whose die keeps rolling, its third tease; also read out */
      goodOne: { en: "Isn\u2019t that a good one?", ja: "\u3044\u3044\u984C\u6750\u3058\u3083\u306A\u3044\uFF1F" },
      /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: hand lettering beside a balloon whose die keeps rolling, its fourth tease ("you think the next one's god-tier?"); also read out */
      godTier: { en: "Holding out for god-tier?", ja: "\u6B21\u3053\u305D\u795E\u984C\u6750\u3060\u3068\u3067\u3082\uFF1F" },
      /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: hand lettering beside a balloon whose die keeps rolling, its fifth tease; also read out */
      breakTheButton: { en: "You\u2019ll break the button!", ja: "\u30DC\u30BF\u30F3\u304C\u58CA\u308C\u3061\u3083\u3046\uFF01" },
      /** Drawing screen, a sheet in Kyoto Seika Practice Mode before Begin: hand lettering beside a balloon whose die keeps rolling, its last warning before the countdown to the bang; also read out */
      warned: { en: "Don\u2019t say I didn\u2019t warn you", ja: "\u3082\u3046\u77E5\u3089\u306A\u3044\u3088\uFF1F" }
    },
    /** The pair as a margin note in the sheet's corner once Begin locked it in. */
    print: {
      /** Drawing screen, a sheet in Kyoto Seika Practice Mode once begun: the canvas's name for screen readers, with the pair, since the faint corner print says nothing to them; in English each subject comes with its English, such as "遊園地, amusement park", and in Japanese it's the word alone */
      canvas: {
        en: "Canvas, subjects {{first}}, and {{second}}",
        ja: "\u30AD\u30E3\u30F3\u30D0\u30B9\u3001\u984C\u6750\u306F{{first}}\u3068{{second}}"
      }
    },
    /** The ink bar over one character of the university's name on the Settings note, like a manga censor bar. */
    censor: {
      /** Settings note: the label that peels on under the censor bar in Kyoto Seika Practice Mode's name when it's tapped */
      why: { en: "Redacted for grown-up reasons", ja: "\u5927\u4EBA\u306E\u4E8B\u60C5\u306B\u3088\u308A\u4F0F\u305B\u3066\u3044\u307E\u3059" }
    },
    /** The pair a sticker drawn in Kyoto Seika Practice Mode was dealt, shown in Japanese only. */
    pair: {
      /** Sticker detail's tag and the sealed card, a sticker drawn in Kyoto Seika Practice Mode: one subject of its pair as English screen readers hear it, such as "風, wind"; Japanese says the word alone */
      subject: { en: "{{word}}, {{english}}" },
      /** Seal sheet and sealed card, a sticker drawn in Kyoto Seika Practice Mode: what screen readers hear for the pair under the title; in English each subject comes with its English, such as "風, wind" */
      spoken: { en: "Subjects: {{first}}, and {{second}}.", ja: "\u984C\u6750\uFF1A{{first}}\u3068{{second}}\u3002" }
    },
    /** The help sheet Settings' "?" opens beside Kyoto Seika Practice Mode's legend: three manga panels of the real screens, each captioned. */
    help: {
      /** Kyoto Seika Practice Mode's help sheet: the characters under the censor bar in its lines' "Kyoto ■ka", never shown */
      hidden: { en: "Sei", ja: "\u7CBE" },
      /** Kyoto Seika Practice Mode's help sheet, under its title: what the mode is for; <bar/> blacks out one character of the university's name */
      lead: {
        en: "Practice for Kyoto <bar/>ka University\u2019s manga expression entrance exam.",
        ja: "\u4EAC\u90FD<bar/>\u83EF\u5927\u5B66\u30DE\u30F3\u30AC\u8868\u73FE\u5165\u8A66\u306E\u7DF4\u7FD2\u30E2\u30FC\u30C9\u3067\u3059\u3002"
      },
      /** Kyoto Seika Practice Mode's help sheet: the caption under the first panel, the two subject balloons a sheet deals */
      subjects: {
        en: "Two subjects to combine in every sticker",
        ja: "\u984C\u6750\u30922\u3064<wbr/>\u7D44\u307F\u5408\u308F\u305B\u3066\u304B\u304F"
      },
      /** Kyoto Seika Practice Mode's help sheet: the caption under the second panel, the timer at the clock's full length; {{minutes}} is that length */
      clock: { en: "{{minutes}} minutes on the clock", ja: "\u30BF\u30A4\u30DE\u30FC{{minutes}}\u5206" },
      /** Kyoto Seika Practice Mode's help sheet: the caption under the third panel, the daily ticket count; {{tickets}} is the day's daily tickets in the mode */
      tickets: { en: "{{tickets}} daily tickets", ja: "\u7121\u511F\u30C1\u30B1\u30C3\u30C8<wbr/>1\u65E5{{tickets}}\u679A" },
      /** Kyoto Seika Practice Mode's help sheet, fine print: in its maker's voice, that Croquis has no connection with the university; <bar/> blacks out one character of its name */
      maker: {
        en: "Croquis isn\u2019t affiliated with Kyoto <bar/>ka. I\u2019m applying there myself, and made this mode to practice.",
        ja: "\u30AF\u30ED\u30C3\u30AD\u30FC\u306F\u4EAC\u90FD<bar/>\u83EF\u5927\u5B66\u3068\u306F\u95A2\u4FC2\u3042\u308A\u307E\u305B\u3093\u3002\u4F5C\u8005\u3082\u53D7\u9A13\u751F\u3067\u3001\u81EA\u5206\u306E\u7DF4\u7FD2\u306E\u305F\u3081\u306B\u4F5C\u308A\u307E\u3057\u305F\u3002"
      },
      /** Kyoto Seika Practice Mode's help sheet, fine print at its foot: the subject list's credit, a link that opens its sources and licenses */
      credit: { en: "Subjects: JMdict (EDRDG)", ja: "\u984C\u6750\uFF1AJMdict\uFF08EDRDG\uFF09" }
    },
    /** The pair a sticker drawn in Kyoto Seika Practice Mode was dealt, in thought clouds on its detail and peeking from it on a board. */
    thought: {
      /** Sticker detail and sticker boards, a sticker drawn in Kyoto Seika Practice Mode: what screen readers hear for its pair, in place of the thought clouds, and in the sticker's name on a board; in English each subject comes with its English, such as "風, wind" */
      spoken: {
        en: "Manga expression practice. Subjects: {{first}}, and {{second}}.",
        ja: "\u30DE\u30F3\u30AC\u8868\u73FE\u7DF4\u7FD2\u3002\u984C\u6750\uFF1A{{first}}\u3068{{second}}\u3002"
      }
    }
  };

  // apps/frontend/src/i18n/strings/line.ts
  var line = {
    /** The screen that holds the app until LINE has logged the person in. */
    gate: {
      /** LINE sign-in screen, while LINE (LIFF) starts up as the app opens: the status line */
      opening: { en: "Opening your sticker board\u2026", ja: "\u30B7\u30FC\u30EB\u30DC\u30FC\u30C9\u3092\u3072\u3089\u3044\u3066\u3044\u307E\u3059\u2026" },
      /** LINE sign-in screen, once LINE (LIFF) has taken about six seconds to start: the line that joins the status line to say the wait is long */
      stillOpening: {
        en: "Still opening. It\u2019s taking longer than usual.",
        ja: "\u307E\u3060\u3072\u3089\u3044\u3066\u3044\u307E\u3059\u3002<wbr/>\u3044\u3064\u3082\u3088\u308A<wbr/>\u6642\u9593\u304C<wbr/>\u304B\u304B\u3063\u3066\u3044\u307E\u3059\u3002"
      },
      /** LINE sign-in screen, in a browser outside LINE before LINE Login: the heading */
      title: { en: "Your sticker board", ja: "\u3042\u306A\u305F\u306E\u30B7\u30FC\u30EB\u30DC\u30FC\u30C9" },
      /** LINE sign-in screen, in a browser outside LINE before LINE Login: the line under the heading */
      lead: { en: "It opens with your LINE account.", ja: "LINE\u30A2\u30AB\u30A6\u30F3\u30C8\u3067<wbr/>\u3072\u3089\u304D\u307E\u3059\u3002" },
      /** LINE sign-in screen, in a browser outside LINE that LINE Login came back to though another browser started it: the line under the heading, in place of the usual one */
      strayAnswer: {
        en: "LINE\u2019s login didn\u2019t finish in this browser. Log in again here.",
        ja: "LINE\u306E<wbr/>\u30ED\u30B0\u30A4\u30F3\u304C\u3001<wbr/>\u3053\u306E\u30D6\u30E9\u30A6\u30B6\u3067\u306F<wbr/>\u5B8C\u4E86\u3057\u307E\u305B\u3093\u3067\u3057\u305F\u3002<wbr/>\u3053\u3053\u3067<wbr/>\u3082\u3046\u4E00\u5EA6<wbr/>\u30ED\u30B0\u30A4\u30F3\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
      },
      /** LINE sign-in screen, in a browser outside LINE: the button that starts LINE Login */
      logIn: { en: "Log in with LINE", ja: "LINE\u3067\u30ED\u30B0\u30A4\u30F3" },
      /** LINE sign-in screen, when LINE (LIFF) fails to start or doesn't start in time: the heading */
      didntStart: { en: "LINE didn\u2019t start", ja: "LINE\u304C\u8D77\u52D5\u3057\u307E\u305B\u3093\u3067\u3057\u305F" },
      /** LINE sign-in screen, when LINE (LIFF) fails to start: the line under the heading, above Try again and LINE's reason in fine print */
      didntStartLead: {
        en: "Your sticker board opens once it does. Check your connection, then try again.",
        ja: "\u8D77\u52D5\u3059\u308B\u3068\u3001<wbr/>\u30B7\u30FC\u30EB\u30DC\u30FC\u30C9\u304C<wbr/>\u3072\u3089\u304D\u307E\u3059\u3002<wbr/>\u63A5\u7D9A\u3092<wbr/>\u78BA\u8A8D\u3057\u3066\u3001<wbr/>\u3082\u3046\u4E00\u5EA6<wbr/>\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
      },
      /** LINE sign-in screen, when LINE (LIFF) fails to start: the button that reloads the page */
      tryAgain: { en: "Try again", ja: "\u3082\u3046\u4E00\u5EA6" },
      /** LINE sign-in screen, when LINE (LIFF) doesn't start in time: LINE's reason in fine print under the key, with {{seconds}} the time it was given */
      noAnswer: {
        en: "LINE didn\u2019t answer within {{seconds}} s",
        ja: "LINE\u304C{{seconds}}\u79D2\u4EE5\u5185\u306B\u5FDC\u7B54\u3057\u307E\u305B\u3093\u3067\u3057\u305F"
      }
    },
    /** The developer slip's LINE details and test message. Never translated. */
    developer: {
      checking: { en: "Checking\u2026" },
      couldntCheck: { en: "Couldn\u2019t check: {{reason}}" },
      none: { en: "None" },
      userId: { en: "LINE user ID" },
      name: { en: "LINE name" },
      statusMessage: { en: "Status message" },
      openedIn: {
        label: { en: "Opened in" },
        lineApp: { en: "The LINE app {{version}} on {{os}}" },
        lineAppUnknownVersion: { en: "The LINE app on {{os}}" },
        browser: { en: "A browser on {{os}}, through LINE Login" },
        unknownOs: { en: "an unknown OS" }
      },
      openedFrom: {
        label: { en: "Opened from" },
        /** By LIFF's context type. */
        contextType: {
          utou: { en: "a one-to-one chat" },
          group: { en: "a group chat" },
          room: { en: "a multi-person chat" },
          square_chat: { en: "an OpenChat" },
          none: { en: "LINE, outside any chat" },
          external: { en: "a browser" }
        },
        unknown: { en: "LINE didn\u2019t say" }
      },
      officialAccount: {
        label: { en: "Official account" },
        friend: { en: "Added as a friend" },
        notFriend: { en: "Not a friend yet" }
      },
      chatMenu: {
        label: { en: "Chat menu" },
        waiting: { en: "Links after sign-in" },
        /** The menu linked for this open, by what its Draw key shows. */
        menus: {
          plain: { en: "Draw \xB7 My board \xB7 Explore, with no count" },
          "3": { en: "Draw with 3 daily tickets left" },
          "2": { en: "Draw with 2 daily tickets left" },
          "1": { en: "Draw with 1 daily ticket left" },
          reserve: { en: "Draw with reserve tickets" },
          none: { en: "Draw with no tickets left" },
          "kyoto-seika-10": {
            en: "Kyoto Seika Manga Expression Practice Mode: draw with 10 daily tickets left"
          },
          "kyoto-seika-9": {
            en: "Kyoto Seika Manga Expression Practice Mode: draw with 9 daily tickets left"
          },
          "kyoto-seika-8": {
            en: "Kyoto Seika Manga Expression Practice Mode: draw with 8 daily tickets left"
          },
          "kyoto-seika-7": {
            en: "Kyoto Seika Manga Expression Practice Mode: draw with 7 daily tickets left"
          },
          "kyoto-seika-6": {
            en: "Kyoto Seika Manga Expression Practice Mode: draw with 6 daily tickets left"
          },
          "kyoto-seika-5": {
            en: "Kyoto Seika Manga Expression Practice Mode: draw with 5 daily tickets left"
          },
          "kyoto-seika-4": {
            en: "Kyoto Seika Manga Expression Practice Mode: draw with 4 daily tickets left"
          },
          "kyoto-seika-3": {
            en: "Kyoto Seika Manga Expression Practice Mode: draw with 3 daily tickets left"
          },
          "kyoto-seika-2": {
            en: "Kyoto Seika Manga Expression Practice Mode: draw with 2 daily tickets left"
          },
          "kyoto-seika-1": {
            en: "Kyoto Seika Manga Expression Practice Mode: draw with 1 daily ticket left"
          },
          "kyoto-seika-reserve": {
            en: "Kyoto Seika Manga Expression Practice Mode: draw with reserve tickets"
          },
          "kyoto-seika-none": {
            en: "Kyoto Seika Manga Expression Practice Mode: draw with no tickets left"
          }
        },
        notAFriend: { en: "Open Sticker Board: add the official account as a friend to switch" },
        /** Why the server linked nothing. */
        off: {
          not_configured: { en: "Off: the server has no Messaging API channel" },
          dev_sign_in: { en: "Off under dev sign-in" },
          no_menu: { en: "Off: no chat menu in this language yet" }
        },
        failed: { en: "Didn\u2019t link: {{reason}}" }
      },
      permissions: { en: "Permissions" },
      idToken: {
        label: { en: "ID token" },
        expires: { en: "Expires {{time}}" },
        expired: { en: "Expired {{time}}" }
      },
      liffApp: {
        label: { en: "LIFF app" },
        value: { en: "{{id}} \xB7 SDK {{version}}" }
      },
      testMessage: {
        send: { en: "Send a test message" },
        /** Sent to the chat the person picks. */
        message: { en: "Test message from Croquis, sent by {{name}} through LINE\u2019s friend picker." },
        pick: { en: "Pick one LINE friend and they get a test message from you." },
        unavailable: {
          en: "LINE\u2019s friend list isn\u2019t available here. It needs LINE Login, in LINE or a browser."
        },
        sent: { en: "Sent. It\u2019s in your chat with the friend you picked." },
        cancelled: { en: "Nothing sent: the friend list was closed." },
        unknown: { en: "LINE didn\u2019t say whether it was sent." }
      }
    }
  };

  // apps/frontend/src/i18n/strings/pages.ts
  var pages = {
    /** Receive gift dialog, Accept sheet: where the terms line's Terms link goes, opened in LINE's in-app browser */
    terms: { en: "/terms.html", ja: "/ja/terms.html" },
    /** Receive gift dialog, Accept sheet: where the terms line's Privacy Policy link goes, opened in LINE's in-app browser */
    privacy: { en: "/privacy.html", ja: "/ja/privacy.html" },
    /** Kyoto Seika Practice Mode: where the subject list's credit links, its sources and licenses */
    sources: { en: "/sources.html", ja: "/ja/sources.html" }
  };

  // apps/frontend/src/i18n/strings/receiving.ts
  var receiving = {
    /** Receive gift dialog, once the gift's preview names the giver: LINE's header and the dialog's name for assistive tech */
    title: { en: "A gift from {{name}}", ja: "{{name}}\u3055\u3093\u304B\u3089\u306E\u30AE\u30D5\u30C8" },
    /** Receive gift dialog, while the gift loads, when loading it failed, or on a refusal that came without the giver: LINE's header and the dialog's name for assistive tech */
    title_unknownGiver: { en: "A gift", ja: "\u30AE\u30D5\u30C8" },
    /** The gift itself: the closed bag and its pull tab, then the reveal and Accept. */
    gift: {
      /** Receive gift dialog, from the closed bag through Accept: the heading beside the giver's picture */
      title: { en: "{{name}} sent you a sticker", ja: "{{name}}\u3055\u3093\u304B\u3089\u30B7\u30FC\u30EB\u304C\u5C4A\u304D\u307E\u3057\u305F" },
      /** Receive gift dialog, closed bag: the two-line hint under the bag, the pull tab first, then the other ways to open it; it fades as the sticker rises */
      pullTabHint: {
        en: "<b>Pull the tab to open it</b><span>or double-tap, or press and hold</span>",
        ja: "<b>\u3064\u307E\u307F\u3092<wbr/>\u5F15\u3044\u3066<wbr/>\u3072\u3089\u3044\u3066\u304F\u3060\u3055\u3044</b><span>\u30C0\u30D6\u30EB\u30BF\u30C3\u30D7\u3084<wbr/>\u9577\u62BC\u3057\u3067\u3082<wbr/>\u3072\u3089\u3051\u307E\u3059</span>"
      },
      /** Receive gift dialog, once the pull tab snaps and the sticker rises: the Accept sheet's name for assistive tech, also read in its perforation's Close name */
      acceptSheet: { en: "Accept this sticker", ja: "\u3053\u306E\u30B7\u30FC\u30EB\u3092\u53D7\u3051\u53D6\u308B" },
      /** Receive gift dialog, Accept sheet: the first line, naming the person opening the gift in bold */
      forYou: { en: "This sticker is for you, <name/>.", ja: "<name/>\u3055\u3093\u3078\u306E\u30B7\u30FC\u30EB\u3067\u3059\u3002" },
      /** Receive gift dialog, Accept sheet: the fine print under the first line, with the sticker's number, drawing time, seal day and Original Artist */
      finePrint: {
        en: "{{no}} \xB7 <duration/> \xB7 {{day}} \xB7 by <artist/>",
        ja: "{{no}}\u30FB<duration/>\u30FB{{day}}\u30FB\u4F5C\u8005\uFF1A<artist/>"
      },
      /** Receive gift dialog, Accept sheet, after tapping Accept fails: the alert above Accept, with the reason */
      notReceived: {
        en: "{{no}} wasn\u2019t received. {{reason}} Tap Accept to try again.",
        ja: "{{no}}\u3092\u53D7\u3051\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002{{reason}}\u300C\u53D7\u3051\u53D6\u308B\u300D\u3092\u30BF\u30C3\u30D7\u3057\u3066\u3001\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
      },
      /** Receive gift dialog, Accept sheet: the main key, which receives the sticker */
      accept: { en: "Accept", ja: "\u53D7\u3051\u53D6\u308B" },
      /** Receive gift dialog, Accept sheet, after tapping Accept: the key's label while the sticker is being received */
      accepting: { en: "Accepting\u2026", ja: "\u53D7\u3051\u53D6\u308A\u4E2D\u2026" },
      /** Receive gift dialog, Accept sheet: the quiet link under Accept that closes the dialog without receiving */
      notNow: { en: "Not now", ja: "\u3042\u3068\u3067" }
    },
    /** Receive gift dialog, Accept sheet: the small line at the bottom, naming the giver, with links to the Terms and Privacy Policy pages */
    termsLine: {
      en: "Receiving it shows <name/> your LINE name and picture. You agree to the <terms>Terms</terms> and <privacy>Privacy Policy</privacy>.",
      ja: "\u53D7\u3051\u53D6\u308B\u3068\u3001<name/>\u3055\u3093\u306B\u3042\u306A\u305F\u306ELINE\u306E\u540D\u524D\u3068\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u753B\u50CF\u304C\u8868\u793A\u3055\u308C\u3001<terms>\u5229\u7528\u898F\u7D04</terms>\u3068<privacy>\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u30DD\u30EA\u30B7\u30FC</privacy>\u306B\u540C\u610F\u3057\u305F\u3053\u3068\u306B\u306A\u308A\u307E\u3059\u3002"
    },
    /**
     * A gift that can't be received here: a title and one line, by refusal. The `_unknownGiver`
     * text is for a refusal that came without the giver, so it says "the giver".
     */
    refusals: {
      nsfwNotOptedIn: {
        /** Gift refusal screen, when the gift holds an NSFW sticker and you haven't turned on Show 18+ stickers: the title */
        title: { en: "This gift is 18+", ja: "\u3053\u306E\u30AE\u30D5\u30C8\u306F18+\u3067\u3059" },
        /** Gift refusal screen, when the gift holds an NSFW sticker and you haven't turned on Show 18+ stickers: the line under the title; {{name}} is the giver */
        line: {
          en: "{{name}} sent an 18+ sticker. To open it, tap your name on My board and turn on Show 18+ stickers in Settings.",
          ja: "{{name}}\u3055\u3093\u304C18+\u306E\u30B7\u30FC\u30EB\u3092\u9001\u308A\u307E\u3057\u305F\u3002\u3072\u3089\u304F\u306B\u306F\u3001\u30DE\u30A4\u30DC\u30FC\u30C9\u3067\u81EA\u5206\u306E\u540D\u524D\u3092\u30BF\u30C3\u30D7\u3057\u3001\u8A2D\u5B9A\u306E\u300C18+\u306E\u30B7\u30FC\u30EB\u3092\u8868\u793A\u3059\u308B\u300D\u3092\u30AA\u30F3\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        },
        /** Gift refusal screen, for an NSFW sticker, when the refusal came without the giver: the line under the title */
        line_unknownGiver: {
          en: "This is an 18+ sticker. To open it, tap your name on My board and turn on Show 18+ stickers in Settings.",
          ja: "18+\u306E\u30B7\u30FC\u30EB\u3067\u3059\u3002\u3072\u3089\u304F\u306B\u306F\u3001\u30DE\u30A4\u30DC\u30FC\u30C9\u3067\u81EA\u5206\u306E\u540D\u524D\u3092\u30BF\u30C3\u30D7\u3057\u3001\u8A2D\u5B9A\u306E\u300C18+\u306E\u30B7\u30FC\u30EB\u3092\u8868\u793A\u3059\u308B\u300D\u3092\u30AA\u30F3\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        }
      },
      groupChat: {
        /** Gift refusal screen, when the gift message was opened in a group chat: the title */
        title: {
          en: "Open this in your chat with {{name}}",
          ja: "{{name}}\u3055\u3093\u3068\u306E\u30C8\u30FC\u30AF\u3067\u3072\u3089\u3044\u3066\u304F\u3060\u3055\u3044"
        },
        /** Gift refusal screen, when the gift message was opened in a group chat and the refusal came without the giver: the title */
        title_unknownGiver: {
          en: "Open this in your chat with the giver",
          ja: "\u8D08\u308A\u4E3B\u3068\u306E\u30C8\u30FC\u30AF\u3067\u3072\u3089\u3044\u3066\u304F\u3060\u3055\u3044"
        },
        /** Gift refusal screen, when the gift message was opened in a group chat: the line under the title */
        line: {
          en: "Gifts open only in the private chat they were sent to. If {{name}} sent it to you, open it there.",
          ja: "\u30AE\u30D5\u30C8\u306F\u3001\u9001\u3089\u308C\u3066\u304D\u305F1\u5BFE1\u306E\u30C8\u30FC\u30AF\u3067\u3057\u304B\u3072\u3089\u3051\u307E\u305B\u3093\u3002{{name}}\u3055\u3093\u304B\u3089\u3042\u306A\u305F\u306B\u5C4A\u3044\u305F\u30AE\u30D5\u30C8\u306A\u3089\u3001\u305D\u306E\u30C8\u30FC\u30AF\u3067\u3072\u3089\u3044\u3066\u304F\u3060\u3055\u3044\u3002"
        },
        /** Gift refusal screen, when the gift message was opened in a group chat and the refusal came without the giver: the line under the title */
        line_unknownGiver: {
          en: "Gifts open only in the private chat they were sent to. If the giver sent it to you, open it there.",
          ja: "\u30AE\u30D5\u30C8\u306F\u3001\u9001\u3089\u308C\u3066\u304D\u305F1\u5BFE1\u306E\u30C8\u30FC\u30AF\u3067\u3057\u304B\u3072\u3089\u3051\u307E\u305B\u3093\u3002\u8D08\u308A\u4E3B\u304B\u3089\u3042\u306A\u305F\u306B\u5C4A\u3044\u305F\u30AE\u30D5\u30C8\u306A\u3089\u3001\u305D\u306E\u30C8\u30FC\u30AF\u3067\u3072\u3089\u3044\u3066\u304F\u3060\u3055\u3044\u3002"
        }
      },
      /** Never who received it: anyone holding a forwarded link would see. */
      alreadyReceived: {
        /** Gift refusal screen, when the gift was already received: the title, over the open, empty bag */
        title: { en: "Already opened", ja: "\u958B\u5C01\u6E08\u307F" },
        /** Gift refusal screen, when the gift was already received: the line under the title */
        line: {
          en: "Each gift message opens once. If it was you, the sticker\u2019s on your sticker board.",
          ja: "\u30AE\u30D5\u30C8\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u3072\u3089\u3051\u308B\u306E\u306F\u4E00\u5EA6\u3060\u3051\u3067\u3059\u3002\u3042\u306A\u305F\u304C\u3072\u3089\u3044\u305F\u306A\u3089\u3001\u30B7\u30FC\u30EB\u306F\u30B7\u30FC\u30EB\u30DC\u30FC\u30C9\u306B\u3042\u308A\u307E\u3059\u3002"
        }
      },
      ownGift: {
        /** Gift refusal screen, when the giver opens their own gift message: the title */
        title: { en: "This gift is on its way", ja: "\u3053\u306E\u30AE\u30D5\u30C8\u306F\u304A\u5C4A\u3051\u4E2D\u3067\u3059" },
        /** Gift refusal screen, when the giver opens their own gift message: the line under the title */
        line: {
          en: "Only the friend you sent it to can open it.",
          ja: "\u3072\u3089\u3051\u308B\u306E\u306F\u3001\u8D08\u308A\u5148\u306E\u53CB\u3060\u3061\u3060\u3051\u3067\u3059\u3002"
        }
      },
      takenBack: {
        /** Gift refusal screen, when the giver took the gift back before anyone received it: the title */
        title: { en: "{{name}} took this one back", ja: "{{name}}\u3055\u3093\u304C\u3053\u306E\u30AE\u30D5\u30C8\u3092\u53D6\u308A\u6D88\u3057\u307E\u3057\u305F" },
        /** Gift refusal screen, when the giver took the gift back and the refusal came without the giver: the title */
        title_unknownGiver: {
          en: "The giver took this one back",
          ja: "\u8D08\u308A\u4E3B\u304C\u3053\u306E\u30AE\u30D5\u30C8\u3092\u53D6\u308A\u6D88\u3057\u307E\u3057\u305F"
        },
        /** Gift refusal screen, when the giver took the gift back before anyone received it: the line under the title */
        line: {
          en: "It went back to their sticker board before anyone received it.",
          ja: "\u3060\u308C\u304B\u304C\u53D7\u3051\u53D6\u308B\u524D\u306B\u3001\u30B7\u30FC\u30EB\u306F\u8D08\u308A\u4E3B\u306E\u30B7\u30FC\u30EB\u30DC\u30FC\u30C9\u306B\u623B\u308A\u307E\u3057\u305F\u3002"
        }
      },
      /** Returned, or expired: either way it's back with the giver. */
      giftReturned: {
        /** Gift refusal screen, when the gift was returned or expired unopened: the title */
        title: { en: "This one went back to {{name}}", ja: "\u3053\u306E\u30AE\u30D5\u30C8\u306F{{name}}\u3055\u3093\u306B\u623B\u308A\u307E\u3057\u305F" },
        /** Gift refusal screen, when the gift was returned or expired and the refusal came without the giver: the title */
        title_unknownGiver: {
          en: "This one went back to the giver",
          ja: "\u3053\u306E\u30AE\u30D5\u30C8\u306F\u8D08\u308A\u4E3B\u306B\u623B\u308A\u307E\u3057\u305F"
        },
        /** Gift refusal screen, when the gift was returned or expired unopened: the line under the title */
        line: {
          en: "Gifts wait a week. This one wasn\u2019t opened in time, so it\u2019s back on their sticker board.",
          ja: "\u30AE\u30D5\u30C8\u306E\u53D7\u3051\u53D6\u308A\u671F\u9650\u306F1\u9031\u9593\u3067\u3059\u3002\u671F\u9650\u5185\u306B\u3072\u3089\u304B\u308C\u306A\u304B\u3063\u305F\u306E\u3067\u3001\u30B7\u30FC\u30EB\u306F\u8D08\u308A\u4E3B\u306E\u30B7\u30FC\u30EB\u30DC\u30FC\u30C9\u306B\u623B\u308A\u307E\u3057\u305F\u3002"
        }
      },
      notDeposited: {
        /** Gift refusal screen, when the gift hasn't reached the escrow yet: the title, above Try again */
        title: { en: "Almost here", ja: "\u3082\u3046\u3059\u3050\u5C4A\u304D\u307E\u3059" },
        /** Gift refusal screen, when the gift hasn't reached the escrow yet: the line under the title */
        line: {
          en: "This gift is still on its way. Try again in a few seconds.",
          ja: "\u3053\u306E\u30AE\u30D5\u30C8\u306F\u307E\u3060\u304A\u5C4A\u3051\u4E2D\u3067\u3059\u3002\u6570\u79D2\u5F8C\u306B\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        }
      },
      giftNotFound: {
        /** Gift refusal screen, when the link's Gift Claim Token matches no gift: the title */
        title: { en: "This link doesn\u2019t open a gift", ja: "\u3053\u306E\u30EA\u30F3\u30AF\u3067\u306F\u30AE\u30D5\u30C8\u3092\u3072\u3089\u3051\u307E\u305B\u3093" },
        /** Gift refusal screen, when the link's Gift Claim Token matches no gift: the line under the title */
        line: {
          en: "Open it again from the gift message in your chat.",
          ja: "\u30C8\u30FC\u30AF\u306E\u30AE\u30D5\u30C8\u30E1\u30C3\u30BB\u30FC\u30B8\u304B\u3089\u3001\u3082\u3046\u4E00\u5EA6\u3072\u3089\u3044\u3066\u304F\u3060\u3055\u3044\u3002"
        }
      }
    },
    /** A preview that failed, and the line for a preview that came back without what it needed. */
    previewFailed: {
      /** Gift refusal screen, when loading the gift's preview failed: the title, above Try again */
      title: { en: "Couldn\u2019t open the gift", ja: "\u30AE\u30D5\u30C8\u3092\u3072\u3089\u3051\u307E\u305B\u3093\u3067\u3057\u305F" },
      /** Gift refusal screen, when the preview says the gift can be received but has no sticker: the line under the title */
      withoutSticker: {
        en: "The gift\u2019s preview came without its sticker.",
        ja: "\u30AE\u30D5\u30C8\u306E\u30D7\u30EC\u30D3\u30E5\u30FC\u306B\u30B7\u30FC\u30EB\u304C\u542B\u307E\u308C\u3066\u3044\u307E\u305B\u3093\u3067\u3057\u305F\u3002"
      },
      /** Gift refusal screen, when the preview says the gift can't be received but gives no reason: the line under the title */
      withoutRefusal: {
        en: "The gift\u2019s preview refused it without saying why.",
        ja: "\u30AE\u30D5\u30C8\u3092\u53D7\u3051\u53D6\u308C\u306A\u3044\u7406\u7531\u304C\u3001\u30D7\u30EC\u30D3\u30E5\u30FC\u306B\u542B\u307E\u308C\u3066\u3044\u307E\u305B\u3093\u3067\u3057\u305F\u3002"
      }
    },
    /** Gift refusal screen, inside LINE's app: the button that closes LINE's window, or the quiet link under Try again */
    backToLine: { en: "Back to LINE", ja: "LINE\u306B\u623B\u308B" },
    /** Gift refusal screen, when the gift is still on its way or its preview failed: the button that loads the gift again */
    tryAgain: { en: "Try again", ja: "\u3082\u3046\u4E00\u5EA6" },
    /** Asks, once a received sticker is on the board, whether to send its giver gratitude now. */
    sendGratitude: {
      /** Send gratitude sheet, over the sticker board once a received sticker has stuck to it: the title beside the giver's picture, also the sheet's name */
      title: { en: "Send {{name}} gratitude?", ja: "{{name}}\u3055\u3093\u306B\u611F\u8B1D\u3092\u9001\u308A\u307E\u3059\u304B\uFF1F" },
      /** Send gratitude sheet, when the giver isn't the sticker's Original Artist: the line under the title */
      line: {
        en: "It\u2019s on your board, from {{name}}. Gratitude never expires.",
        ja: "{{name}}\u3055\u3093\u304B\u3089\u306E\u30B7\u30FC\u30EB\u304C\u3001\u30B7\u30FC\u30EB\u30DC\u30FC\u30C9\u306B\u8CBC\u3089\u308C\u307E\u3057\u305F\u3002\u611F\u8B1D\u306F\u3044\u3064\u3067\u3082\u9001\u308C\u307E\u3059\u3002"
      },
      /** Send gratitude sheet, when the giver is the sticker's Original Artist: the line under the title, with their drawing time */
      lineFromOriginalArtist: {
        en: "It\u2019s on your board. <name/> drew it in <duration/>, and gratitude never expires.",
        ja: "\u30B7\u30FC\u30EB\u30DC\u30FC\u30C9\u306B\u8CBC\u3089\u308C\u307E\u3057\u305F\u3002<name/>\u3055\u3093\u304C<duration/>\u3067\u304B\u3044\u305F\u30B7\u30FC\u30EB\u3067\u3059\u3002\u611F\u8B1D\u306F\u3044\u3064\u3067\u3082\u9001\u308C\u307E\u3059\u3002"
      },
      /** Send gratitude sheet: the pink key that starts the Gratitude Mini-game for the giver */
      send: { en: "Send gratitude", ja: "\u611F\u8B1D\u3092\u9001\u308B" },
      /** Send gratitude sheet: the quiet link under Send gratitude, which closes the sheet without sending gratitude */
      later: { en: "Later", ja: "\u3042\u3068\u3067" }
    },
    /** The badge on your own sticker board for gifts waiting for you, newest first. */
    giftsForYou: {
      /** Gifts for you badge on your own sticker board: its first line, with one gift waiting */
      title_one: { en: "A gift for you" },
      /** Gifts for you badge on your own sticker board: its first line, with gifts waiting, beside the dot badge that counts them */
      title_other: { en: "Gifts for you", ja: "\u5C4A\u3044\u305F\u30AE\u30D5\u30C8" },
      /** Gifts for you badge on your own sticker board: the line under the title, naming who sent the newest gift; <name/> is their handle, which keeps its own case in the capitals */
      from: { en: "from <name/>", ja: "<name/>\u3055\u3093\u304B\u3089" },
      /** Gifts for you badge on your own sticker board: its name for assistive tech, tapping it opens the newest gift */
      label_one: { en: "A gift for you from {{name}}. Open it" },
      /** Gifts for you badge on your own sticker board: its name for assistive tech with several gifts, tapping it opens the newest */
      label_other: {
        en: "{{count}} gifts for you. Open the newest, from {{name}}",
        ja: "\u30AE\u30D5\u30C8\u304C{{count}}\u4EF6\u3002{{name}}\u3055\u3093\u304B\u3089\u306E\u6700\u65B0\u306E\u30AE\u30D5\u30C8\u3092\u3072\u3089\u304F"
      }
    }
  };

  // apps/frontend/src/i18n/strings/shop.ts
  var shop = {
    /** The Shop tab: the page's title */
    title: { en: "Shop", ja: "\u30B7\u30E7\u30C3\u30D7" },
    /** The Shop's reserve tickets section, the one thing on sale */
    reserve: {
      /** Reserve tickets section: its headline, under the fanned tickets */
      title: { en: "Reserve tickets", ja: "\u6709\u511F\u30C1\u30B1\u30C3\u30C8" },
      /** Reserve tickets section: the one line under the headline, on what they're for */
      lead: {
        en: "Keep drawing after your daily tickets run out.",
        ja: "\u7121\u511F\u30C1\u30B1\u30C3\u30C8\u3092<wbr/>\u4F7F\u3044\u5207\u3063\u3066\u3082\u3001<wbr/>\u304B\u304D\u7D9A\u3051\u3089\u308C\u307E\u3059\u3002"
      },
      /** Reserve tickets section, over the Buy key: the ones you hold; `<count/>` is the reserve ticket mark and ×count */
      held: { en: "You have <count/>", ja: "\u6240\u6301\u6570<count/>" },
      /** Reserve tickets section: what the line above says, for screen readers, when you hold one */
      heldSpoken_one: { en: "You have {{count}} reserve ticket." },
      /** Reserve tickets section: what the line above says, for screen readers */
      heldSpoken_other: {
        en: "You have {{count}} reserve tickets.",
        ja: "\u6709\u511F\u30C1\u30B1\u30C3\u30C8\u3092{{count}}\u679A\u6301\u3063\u3066\u3044\u307E\u3059\u3002"
      },
      /** Reserve tickets section, in the held tickets' place, when your tickets didn't load, so the Shop can't say how many you hold; `reason` is why, in the app's language, before a Try again link */
      heldProblem: {
        en: "Couldn\u2019t load your tickets: {{reason}}",
        ja: "\u30C1\u30B1\u30C3\u30C8\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
      },
      /** Reserve tickets section: the blue key that opens the reserve ticket checkout */
      buy: { en: "Buy reserve tickets", ja: "\u6709\u511F\u30C1\u30B1\u30C3\u30C8\u3092\u8CB7\u3046" },
      /** Reserve tickets section, under the Buy key: the label button that holds up your Sui address and its QR code, to send JPYC to */
      deposit: { en: "Deposit", ja: "\u5165\u91D1" }
    },
    /** The Shop: the one pill over the coming-soon shelves, saying nothing on them is on sale yet */
    comingSoon: { en: "Coming soon", ja: "\u8FD1\u65E5\u767B\u5834" },
    /** On the first swatch of each coming-soon shelf: the one you have now */
    yours: { en: "Yours", ja: "\u4F7F\u7528\u4E2D" },
    /** The coming-soon shelves, each a row of four swatches */
    shelves: {
      laminates: {
        /** Laminates shelf: its name */
        title: { en: "Laminates", ja: "\u30E9\u30DF\u30CD\u30FC\u30C8" },
        items: {
          /** Laminates shelf: the first swatch's name, the laminate every sticker is sealed with now */
          gloss: { en: "Gloss", ja: "\u30B0\u30ED\u30B9" },
          /** Laminates shelf: the matte laminate swatch's name, coming soon */
          matte: { en: "Matte", ja: "\u30DE\u30C3\u30C8" },
          /** Laminates shelf: the glitter laminate swatch's name, coming soon */
          glitter: { en: "Glitter", ja: "\u30E9\u30E1" },
          /** Laminates shelf: the prism laminate swatch's name, coming soon */
          prism: { en: "Prism", ja: "\u30D7\u30EA\u30BA\u30E0" }
        }
      },
      brushes: {
        /** Brushes shelf: its name */
        title: { en: "Brushes", ja: "\u30D6\u30E9\u30B7" },
        items: {
          /** Brushes shelf: the first swatch's name, the brush the drawing screen has now */
          brush: { en: "Brush", ja: "\u30D6\u30E9\u30B7" },
          /** Brushes shelf: the marker swatch's name, coming soon */
          marker: { en: "Marker", ja: "\u30DE\u30FC\u30AB\u30FC" },
          /** Brushes shelf: the fineliner swatch's name, coming soon */
          fineliner: { en: "Fineliner", ja: "\u30DF\u30EA\u30DA\u30F3" },
          /** Brushes shelf: the pixel pen swatch's name, coming soon */
          pixelPen: { en: "Pixel pen", ja: "\u30C9\u30C3\u30C8\u30DA\u30F3" }
        }
      },
      backingFoils: {
        /** Backing foils shelf: its name */
        title: { en: "Backing foils", ja: "\u30DB\u30A4\u30EB" },
        items: {
          /** Backing foils shelf: the first swatch's name, the foil every sticker wears now */
          holo: { en: "Holo", ja: "\u30DB\u30ED" },
          /** Backing foils shelf: the gold foil swatch's name, coming soon */
          gold: { en: "Gold", ja: "\u30B4\u30FC\u30EB\u30C9" },
          /** Backing foils shelf: the silver foil swatch's name, coming soon */
          silver: { en: "Silver", ja: "\u30B7\u30EB\u30D0\u30FC" },
          /** Backing foils shelf: the rose gold foil swatch's name, coming soon */
          roseGold: { en: "Rose gold", ja: "\u30ED\u30FC\u30BA\u30B4\u30FC\u30EB\u30C9" }
        }
      }
    }
  };

  // apps/frontend/src/i18n/strings/stickerBoard.ts
  var stickerBoard = {
    /** The stat board, the back of a sticker board: your own, or someone else's. */
    statBoard: {
      /** Stat board (the back of a sticker board, yours or someone else's): screen readers' name for the dialog; {{name}} is the board owner's LINE name */
      label: { en: "{{name}}\u2019s stats", ja: "{{name}}\u3055\u3093\u306E\u8A18\u9332" },
      /** Your stat board, while your User Stats load: the one line screen readers hear, in place of the figures */
      loadingOwn: { en: "Loading your stats", ja: "\u3042\u306A\u305F\u306E\u8A18\u9332\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059" },
      /** Someone else's stat board, while their User Stats load: the one line screen readers hear, in place of the figures */
      loadingTheirs: {
        en: "Loading {{name}}\u2019s stats",
        ja: "{{name}}\u3055\u3093\u306E\u8A18\u9332\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059"
      },
      /** A figure whose source didn't load: a dash on screen, words for screen readers. */
      notKnown: {
        /** Stat board: the dash in place of a figure whose data didn't load (hidden from screen readers) */
        mark: { en: "\u2013", ja: "\u2013" },
        /** Stat board: what screen readers say in place of a figure whose data didn't load */
        spoken: { en: "not known", ja: "\u4E0D\u660E" }
      },
      gratitude: {
        /** Stat board: the heading of the Gratitude receipt, the paper under the pink pushpin */
        title: { en: "Gratitude received", ja: "\u53D7\u3051\u53D6\u3063\u305F\u611F\u8B1D" },
        /** Your stat board, Gratitude receipt: in place of the total before you've received any gratitude */
        noneYetOwn: {
          en: "No gratitude yet. It arrives when someone you give a sticker to sends you some for it.",
          ja: "\u307E\u3060\u611F\u8B1D\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u30B7\u30FC\u30EB\u3092\u8D08\u3063\u305F\u76F8\u624B\u304C\u611F\u8B1D\u3092\u9001\u308B\u3068\u3001\u3053\u3053\u306B\u5C4A\u304D\u307E\u3059\u3002"
        },
        /** Someone else's stat board, Gratitude receipt: in place of the total before they've received any gratitude */
        noneYet: {
          en: "No gratitude yet. It arrives when someone sends gratitude for a sticker they gave them.",
          ja: "\u307E\u3060\u611F\u8B1D\u306F\u3042\u308A\u307E\u305B\u3093\u3002\u8D08\u3063\u305F\u30B7\u30FC\u30EB\u306B\u76F8\u624B\u304C\u611F\u8B1D\u3092\u9001\u308B\u3068\u3001\u3053\u3053\u306B\u5C4A\u304D\u307E\u3059\u3002"
        },
        /** Your gratitude events: every combo that gave you gratitude, opened from your receipt. */
        events: {
          /** Your stat board, Gratitude receipt: the quiet link under the total that opens your gratitude events */
          open: { en: "See where it came from", ja: "\u5185\u8A33\u3092\u898B\u308B" },
          /** Your gratitude events sheet: the mark on a row that's your Original Artist Gratitude Share, from a sticker you drew that someone else gave */
          residual: { en: "Residual", ja: "\u4F5C\u8005\u3068\u3057\u3066" },
          /** Your gratitude events sheet: the link under the rows that loads older ones */
          more: { en: "Show more", ja: "\u3082\u3063\u3068\u898B\u308B" },
          /** Your gratitude events sheet: what screen readers hear while the rows load */
          loading: { en: "Loading your gratitude", ja: "\u611F\u8B1D\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059" },
          /** Your gratitude events sheet: in place of the rows, or under them for older ones, when they didn't load, with the reason */
          didntLoad: {
            en: "Your gratitude didn\u2019t load: {{reason}}",
            ja: "\u611F\u8B1D\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
          }
        }
      },
      bests: {
        /** Stat board: the heading of the Bests scrap */
        title: { en: "Bests", ja: "\u81EA\u5DF1\u30D9\u30B9\u30C8" },
        /** Stat board, Bests scrap: the Longest streak row's label */
        longestStreak: { en: "Longest streak", ja: "\u6700\u9577\u9023\u7D9A\u65E5\u6570" },
        /** Stat board, Bests scrap: the Longest streak figure when it's one day; {{days}} is the count */
        days_one: { en: "{{days}} day" },
        /** Stat board, Bests scrap: the Longest streak figure, such as "12 days"; {{days}} is the count */
        days_other: { en: "{{days}} days", ja: "{{days}}\u65E5" },
        /** Stat board, Bests scrap: the Best combo row's label */
        bestCombo: { en: "Best combo", ja: "\u6700\u9AD8\u30B3\u30F3\u30DC" },
        /** Stat board, Bests scrap: the label of the row for the most gratitude received in one day, before the heart and that figure */
        bestDay: { en: "Best day", ja: "1\u65E5\u306E\u6700\u591A\u611F\u8B1D" },
        /** Stat board, Bests scrap: in place of a best that has no figure yet */
        noneYet: { en: "None yet", ja: "\u307E\u3060\u306A\u3057" }
      },
      /** Stat board: the label-maker tape with the day they joined, such as "Since 2026.09.01" (hidden from screen readers) */
      since: { en: "Since {{day}}", ja: "{{day}}\u304B\u3089" },
      /** Stat board: what screen readers say for the label-maker tape with the day they joined */
      sinceSpoken: { en: "On the app since {{day}}", ja: "{{day}}\u304B\u3089\u30AF\u30ED\u30C3\u30AD\u30FC\u3092\u4F7F\u3063\u3066\u3044\u307E\u3059" },
      streak: {
        /** Stat board: the heading of the Streak leaf, over the day count */
        title: { en: "Streak", ja: "\u9023\u7D9A\u65E5\u6570" },
        /** Stat board, Streak leaf: the word under the day count when it's 1 */
        days_one: { en: "day" },
        /** Stat board, Streak leaf: the word under the day count, such as "12" over "days" */
        days_other: { en: "days", ja: "\u65E5" },
        /** Stat board, Streak leaf: in place of the day count while there's no streak */
        notStarted: { en: "Not started", ja: "\u307E\u3060\u3053\u308C\u304B\u3089" }
      },
      /** Your stat board, Gratitude receipt: in place of its rows when your User Stats fail to load, with the reason */
      didntLoadOwnBecause: {
        en: "Your stats didn\u2019t load: {{reason}}",
        ja: "\u8A18\u9332\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
      },
      stamps: {
        /** Stat board: screen readers' name for the three stamps that count stickers made, received and given */
        label: { en: "Stickers", ja: "\u30B7\u30FC\u30EB" },
        /** Stat board: the word under the count on the stamp for stickers made */
        made: { en: "made", ja: "\u3064\u304F\u3063\u305F" },
        /** Stat board: the word under the count on the stamp for stickers received */
        received: { en: "received", ja: "\u53D7\u3051\u53D6\u3063\u305F" },
        /** Stat board: the word under the count on the stamp for stickers given */
        given: { en: "given", ja: "\u8D08\u3063\u305F" }
      },
      /** Stat board: the Flip back button, which turns the board back over to its stickers */
      flipBack: { en: "Flip back", ja: "\u8868\u306B\u623B\u3059" },
      /** Your stat board, opened outside LINE's app: the button after Flip back, at the top left, that logs out of LINE */
      logOut: { en: "Log out of LINE", ja: "LINE\u304B\u3089\u30ED\u30B0\u30A2\u30A6\u30C8" }
    },
    /** A Sui address as a QR code on the cork, yours or someone else's, and the dialog that holds it up. */
    addresses: {
      sui: {
        /** Stat board, yours or someone else's: the caption on the Sui address's QR code paper */
        caption: { en: "Sui address", ja: "Sui\u30A2\u30C9\u30EC\u30B9" },
        /** Your stat board: fine print on the Sui address paper, under its caption, saying what the address is for */
        gloss: { en: "Holds your stickers", ja: "\u30B7\u30FC\u30EB\u306E\u4FDD\u7BA1\u7528" },
        /** Your stat board: screen readers' name for the Sui address paper, a button that holds its QR code up in the address dialog */
        open: { en: "Show your Sui address as a QR code", ja: "Sui\u30A2\u30C9\u30EC\u30B9\u3092QR\u30B3\u30FC\u30C9\u3067\u8868\u793A" },
        /** Your stat board: on the Sui address paper while the address loads */
        loading: { en: "Getting your Sui address\u2026", ja: "Sui\u30A2\u30C9\u30EC\u30B9\u3092<wbr/>\u53D6\u5F97\u3057\u3066\u3044\u307E\u3059\u2026" },
        /** Stat board, yours or someone else's: on the Sui address paper when the address didn't load, over Try again */
        didntLoad: { en: "Sui address didn\u2019t load", ja: "Sui\u30A2\u30C9\u30EC\u30B9\u3092<wbr/>\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F" },
        /** Address dialog for the Sui address: its heading, under the large QR code */
        title: { en: "Your Sui address", ja: "\u3042\u306A\u305F\u306ESui\u30A2\u30C9\u30EC\u30B9" },
        /** Address dialog for the Sui address: screen readers' name for the large QR code */
        qrCode: { en: "QR code of your Sui address", ja: "Sui\u30A2\u30C9\u30EC\u30B9\u306EQR\u30B3\u30FC\u30C9" },
        /** Address dialog for the Sui address: the note under the address */
        note: {
          en: "Your stickers are kept at this address on Sui Testnet, and reserve tickets are paid from it.",
          ja: "\u3042\u306A\u305F\u306E\u30B7\u30FC\u30EB\u306F\u3001<wbr/>Sui\xA0Testnet\u306E<wbr/>\u3053\u306E\u30A2\u30C9\u30EC\u30B9\u306B<wbr/>\u4FDD\u7BA1\u3055\u308C\u307E\u3059\u3002<wbr/>\u6709\u511F\u30C1\u30B1\u30C3\u30C8\u3082\u3001<wbr/>\u3053\u306E\u30A2\u30C9\u30EC\u30B9\u304B\u3089<wbr/>\u652F\u6255\u3044\u307E\u3059\u3002"
        },
        /** Address dialog for the Sui address: the toast after Copy address copies it */
        copied: { en: "Sui address copied", ja: "Sui\u30A2\u30C9\u30EC\u30B9\u3092\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F" },
        /** Address dialog for the Sui address: the line under Copy address when it can't copy the address, which stays until the next try */
        notCopied: {
          en: "Couldn\u2019t copy the Sui address. Touch and hold it to copy it yourself.",
          ja: "Sui\u30A2\u30C9\u30EC\u30B9\u3092\u30B3\u30D4\u30FC\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u30A2\u30C9\u30EC\u30B9\u3092\u9577\u62BC\u3057\u3057\u3066\u3001\u3054\u81EA\u8EAB\u3067\u30B3\u30D4\u30FC\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        },
        /** Address dialog for the Sui address: the link under Copy address that opens the address on Suiscan */
        viewOnExplorer: { en: "View on Suiscan", ja: "Suiscan\u3067\u898B\u308B" },
        /** Address dialog for the Sui address: screen readers' name for the Suiscan link */
        viewOnExplorerLabel: {
          en: "View on Suiscan: your Sui address",
          ja: "Sui\u30A2\u30C9\u30EC\u30B9\u3092Suiscan\u3067\u898B\u308B"
        },
        /** Someone else's Sui address, on their stat board; {{name}} is the board owner's LINE name. */
        theirs: {
          /** Someone else's stat board: fine print on the Sui address paper, under its caption, saying what the address is for */
          gloss: { en: "Holds their stickers", ja: "\u30B7\u30FC\u30EB\u306E\u4FDD\u7BA1\u7528" },
          /** Someone else's stat board: screen readers' name for the Sui address paper, a button that holds its QR code up in the address dialog */
          open: {
            en: "Show {{name}}\u2019s Sui address as a QR code",
            ja: "{{name}}\u3055\u3093\u306ESui\u30A2\u30C9\u30EC\u30B9\u3092QR\u30B3\u30FC\u30C9\u3067\u8868\u793A"
          },
          /** Someone else's stat board: on the Sui address paper while the address loads */
          loading: { en: "Getting their Sui address\u2026", ja: "Sui\u30A2\u30C9\u30EC\u30B9\u3092<wbr/>\u53D6\u5F97\u3057\u3066\u3044\u307E\u3059\u2026" },
          /** Address dialog for someone else's Sui address: its heading, under the large QR code */
          title: { en: "{{name}}\u2019s Sui address", ja: "{{name}}\u3055\u3093\u306ESui\u30A2\u30C9\u30EC\u30B9" },
          /** Address dialog for someone else's Sui address: screen readers' name for the large QR code */
          qrCode: {
            en: "QR code of {{name}}\u2019s Sui address",
            ja: "{{name}}\u3055\u3093\u306ESui\u30A2\u30C9\u30EC\u30B9\u306EQR\u30B3\u30FC\u30C9"
          },
          /** Address dialog for someone else's Sui address: the note under the address */
          note: {
            en: "{{name}}\u2019s stickers are kept at this address on Sui Testnet.",
            ja: "{{name}}\u3055\u3093\u306E\u30B7\u30FC\u30EB\u306F\u3001<wbr/>Sui Testnet\u306E<wbr/>\u3053\u306E\u30A2\u30C9\u30EC\u30B9\u306B<wbr/>\u4FDD\u7BA1\u3055\u308C\u307E\u3059\u3002"
          },
          /** Address dialog for someone else's Sui address: screen readers' name for the Suiscan link */
          viewOnExplorerLabel: {
            en: "View on Suiscan: {{name}}\u2019s Sui address",
            ja: "{{name}}\u3055\u3093\u306ESui\u30A2\u30C9\u30EC\u30B9\u3092Suiscan\u3067\u898B\u308B"
          }
        }
      },
      /** Stat board, yours or someone else's: the link on the Sui address paper when its address didn't load */
      tryAgain: { en: "Try again", ja: "\u3082\u3046\u4E00\u5EA6" },
      /** Your stat board: the link on the Sui address paper after the wallet provider failed, which reloads Croquis */
      reload: { en: "Reload", ja: "\u518D\u8AAD\u307F\u8FBC\u307F" },
      /** Address dialog: screen readers' name for the X button that puts the paper back on the cork */
      close: { en: "Close", ja: "\u9589\u3058\u308B" },
      /** Address dialog: the Copy address button under the card */
      copy: { en: "Copy address", ja: "\u30A2\u30C9\u30EC\u30B9\u3092\u30B3\u30D4\u30FC" }
    },
    /** The Settings note, the first paper under the stats on your stat board. */
    settings: {
      /** Your stat board: the title of the Settings note, the first paper under the stats on the cork, which peeks up from the cork's foot until it's scrolled into view */
      title: { en: "Settings", ja: "\u8A2D\u5B9A" },
      language: {
        /** Settings note: the language row's name, before its two choices, English and 日本語 */
        title: { en: "Language", ja: "\u8A00\u8A9E" },
        /** Each language is named in its own language. */
        names: {
          /** Settings note: the English choice, named in English */
          en: { en: "English", ja: "English" },
          /** Settings note: the Japanese choice, named in Japanese */
          ja: { en: "\u65E5\u672C\u8A9E", ja: "\u65E5\u672C\u8A9E" }
        },
        /** Settings note: the alert when the language choice didn't save to your account, with the reason */
        notSaved: {
          en: "Your language couldn\u2019t be saved, so it hasn\u2019t changed: {{reason}}",
          ja: "\u8A00\u8A9E\u3092\u4FDD\u5B58\u3067\u304D\u306A\u304B\u3063\u305F\u305F\u3081\u3001\u5909\u66F4\u3057\u3066\u3044\u307E\u305B\u3093\uFF1A{{reason}}"
        },
        /** Settings note: the alert when the language saved and the app switched, but this device couldn't keep it for its next start, over the device's own words for a report */
        notKept: {
          en: "Your language is saved, but this device couldn\u2019t keep it: the next time you open Croquis, it may start in the old one for a moment.",
          ja: "\u8A00\u8A9E\u306F\u4FDD\u5B58\u3057\u307E\u3057\u305F\u304C\u3001\u3053\u306E\u7AEF\u672B\u306B\u306F\u6B8B\u305B\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u6B21\u306B\u30AF\u30ED\u30C3\u30AD\u30FC\u3092\u3072\u3089\u3044\u305F\u3068\u304D\u3001\u5C11\u3057\u306E\u3042\u3044\u3060\u524D\u306E\u8A00\u8A9E\u3067\u8868\u793A\u3055\u308C\u308B\u3053\u3068\u304C\u3042\u308A\u307E\u3059\u3002"
        }
      },
      /** The NSFW opt-in, a second setting under Language. */
      nsfw: {
        /** Settings note: the NSFW opt-in's switch, off until you turn it on; on, 18+ stickers show unblurred and you can receive them */
        show: { en: "Show 18+ stickers", ja: "18+\u306E\u30B7\u30FC\u30EB\u3092\u8868\u793A\u3059\u308B" },
        /** Settings note: the alert when the NSFW opt-in didn't save to your account, with the reason */
        notSaved: {
          en: "Your 18+ setting couldn\u2019t be saved, so it hasn\u2019t changed: {{reason}}",
          ja: "18+\u306E\u8A2D\u5B9A\u3092\u4FDD\u5B58\u3067\u304D\u306A\u304B\u3063\u305F\u305F\u3081\u3001\u5909\u66F4\u3057\u3066\u3044\u307E\u305B\u3093\uFF1A{{reason}}"
        }
      },
      /** Kyoto Seika Manga Expression Practice Mode, a third setting under 18+. */
      kyotoSeika: {
        /** Settings note: Kyoto Seika Practice Mode's switch row, one character of its university blacked out by <bar/>, with "?" after it */
        name: {
          en: "Kyoto <bar/>ka Manga Expression Practice Mode",
          ja: "\u4EAC\u90FD<bar/>\u83EF\u5927\u5B66<wbr/>\u30DE\u30F3\u30AC\u8868\u73FE<wbr/>\u7DF4\u7FD2\u30E2\u30FC\u30C9"
        },
        /** Settings note: the characters under the censor bar in Kyoto Seika Practice Mode's name, never shown */
        hidden: { en: "Sei", ja: "\u7CBE" },
        /** Settings note: what screen readers hear as the name of Kyoto Seika Practice Mode's switch, since the bar is a sight gag */
        spokenName: {
          en: "Kyoto Seika Manga Expression Practice Mode",
          ja: "\u4EAC\u90FD\u7CBE\u83EF\u5927\u5B66 \u30DE\u30F3\u30AC\u8868\u73FE\u7DF4\u7FD2\u30E2\u30FC\u30C9"
        },
        /** Settings note: screen readers' name for the "?" after Kyoto Seika Practice Mode's name, which opens its help sheet */
        help: { en: "About this mode", ja: "\u3053\u306E\u30E2\u30FC\u30C9\u306B\u3064\u3044\u3066" },
        /** Settings note: the alert when Kyoto Seika Practice Mode's switch didn't save to your account, with the reason */
        notSaved: {
          en: "Your Manga Expression Practice Mode setting couldn\u2019t be saved, so it hasn\u2019t changed: {{reason}}",
          ja: "\u30DE\u30F3\u30AC\u8868\u73FE\u7DF4\u7FD2\u30E2\u30FC\u30C9\u306E\u8A2D\u5B9A\u3092\u4FDD\u5B58\u3067\u304D\u306A\u304B\u3063\u305F\u305F\u3081\u3001\u5909\u66F4\u3057\u3066\u3044\u307E\u305B\u3093\uFF1A{{reason}}"
        }
      },
      /** The Drawing group, after Kyoto Seika Practice Mode: settings this device keeps for drawing, not your account. */
      drawing: {
        /** Settings note: the legend over the Drawing group, the drawing screen's settings this device keeps */
        title: { en: "Drawing", ja: "\u304B\u304F\u753B\u9762" },
        /** The drawing hand: Left mirrors the drawing screen. */
        hand: {
          /** Settings note, Drawing group: the drawing hand row's name, before its choices, Right and Left */
          label: { en: "Drawing hand", ja: "\u5229\u304D\u624B" },
          /** Settings note, Drawing group: the drawing hand choice for the right hand, the default */
          right: { en: "Right", ja: "\u53F3\u624B" },
          /** Settings note, Drawing group: the drawing hand choice for the left hand, which mirrors the drawing screen */
          left: { en: "Left", ja: "\u5DE6\u624B" }
        },
        /** Settings note, Drawing group: the alert when this device couldn't keep a drawing setting, which still applies until Croquis closes */
        notKept: {
          en: "This device couldn\u2019t keep that, so it lasts until you close Croquis.",
          ja: "\u3053\u306E\u7AEF\u672B\u306B\u4FDD\u5B58\u3067\u304D\u306A\u304B\u3063\u305F\u305F\u3081\u3001\u30AF\u30ED\u30C3\u30AD\u30FC\u3092\u9589\u3058\u308B\u307E\u3067\u306E\u8A2D\u5B9A\u306B\u306A\u308A\u307E\u3059\u3002"
        }
      },
      /** The Drawing group's Pencil rows, shown once a pen has drawn on this device. */
      pencil: {
        input: {
          /** Settings note, Drawing group: the Input row's name, the input each new drawing starts in */
          title: { en: "Input", ja: "\u5165\u529B" },
          /** Settings note, Drawing group: the Input choice where only the pen draws and fingers tap to undo and redo */
          pencilOnly: { en: "Pencil only", ja: "\u30DA\u30F3\u306E\u307F" },
          /** Settings note, Drawing group: the Input choice where fingers draw as well as the pen */
          pencilAndFinger: { en: "Pencil and finger", ja: "\u30DA\u30F3\u3068\u6307" }
        },
        pressure: {
          /** Settings note, Drawing group: the Pen pressure row's name */
          title: { en: "Pen pressure", ja: "\u7B46\u5727" },
          /** Settings note, Drawing group: the Pen pressure choice where the pen draws the brush's own width */
          off: { en: "Off", ja: "\u30AA\u30D5" },
          /** Settings note, Drawing group: the Pen pressure choice where a light touch already draws wide */
          light: { en: "Light", ja: "\u8EFD\u3081" },
          /** Settings note, Drawing group: the Pen pressure choice that's the usual curve, the default */
          normal: { en: "Normal", ja: "\u3075\u3064\u3046" },
          /** Settings note, Drawing group: the Pen pressure choice where full width takes more force */
          firm: { en: "Firm", ja: "\u5F37\u3081" },
          /** Settings note, Drawing group: the small print on the strip of paper under Pen pressure, where the pen tries the chosen curve; hidden from screen readers */
          tryIt: { en: "Try it", ja: "\u305F\u3081\u3057\u304C\u304D" }
        }
      }
    },
    /** The developer slip: English only, so the Japanese catalog never translates it. */
    developer: {
      label: { en: "Developer tools" },
      title: { en: "LINE and Privy" },
      privy: {
        signedIn: { en: "Signed in to Privy" },
        signingIn: { en: "Signing in to Privy\u2026" },
        failed: { en: "Privy sign-in failed: {{reason}}" },
        off: { en: "Privy is off on the dev server, where LIFF Mock signs you in" },
        tryAgain: { en: "Try again" },
        reload: { en: "Reload" }
      },
      creases: {
        title: { en: "Creases" },
        show: { en: "Show creases on this device" },
        unkept: { en: "This device couldn\u2019t keep it, so it lasts until the app reloads" },
        cantBake: { en: "This browser can\u2019t paint in a worker, so no crease is baked here" }
      },
      demoPeople: {
        title: { en: "Demo people" },
        switchTo: { en: "Switch to {{name}}" }
      },
      gratitudeDemo: {
        title: { en: "Gratitude mini-game" },
        try: { en: "Try the gratitude mini-game" },
        drawFirst: { en: "Draw a sticker first" },
        fullEffects: { en: "Full effects" },
        showFrameTimes: { en: "Show frame times" }
      },
      performance: {
        title: { en: "Performance" },
        record: { en: "Record performance" },
        what: {
          en: "Slow frames and what happened around them, and each kind of pointer. While it\u2019s on, it records from the app\u2019s start and sends its report to the server as it goes."
        },
        nothingYet: { en: "Nothing recorded yet" },
        copy: { en: "Copy report" },
        clear: { en: "Clear" },
        copied: { en: "Copied. Paste it into the chat." },
        /** It switched, but its setting wasn't kept for the next start. */
        onUntilRestart: { en: "Recording is on until the app restarts: {{reason}}" },
        offUntilRestart: { en: "Recording is off until the app restarts: {{reason}}" },
        couldntStart: { en: "Recording couldn\u2019t start: {{reason}}" },
        couldntStop: { en: "Recording couldn\u2019t stop: {{reason}}" },
        notCopied: { en: "The report couldn\u2019t be copied: {{reason}}. It\u2019s below to copy by hand." },
        notUploaded: { en: "The report wasn\u2019t uploaded: {{reason}}. The next send tries again." },
        report: { en: "Performance report" },
        /** The slip's line: time recorded, slow frames, the worst and the pace. */
        summary: {
          slow: { en: "{{slow}} slow of {{frames}} frames ({{share}})" },
          worst: { en: "worst {{worst}}" }
        },
        /** The report's lines, which the server log keeps for agents to read. */
        lines: {
          taken: { en: "Performance report, taken {{time}}" },
          clock: { en: "Clock: {{step}} steps" },
          start: { en: "Start, on the page's clock" },
          window: {
            frames: { en: "{{label}}: {{frames}} frames in {{seconds}}" },
            noFrames: { en: "{{label}}: no frames recorded" },
            slow: { en: "{{slow}} slow ({{share}})" },
            worst: { en: "worst {{worst}} at {{at}}" },
            typical: { en: "typical {{typical}} ({{fps}})" },
            percentile95: { en: "95th percentile {{interval}}" },
            boardNotRecorded: {
              en: "The 5s after the board was complete: not recorded, as the recorder was off then"
            }
          },
          recorded: { en: "{{span}} recorded \xB7 {{frames}} frames \xB7 {{slow}} slow ({{share}})" },
          worst: { en: "Worst {{worst}} at {{at}} on {{screen}}" },
          typical: { en: "Typical frame {{typical}} ({{fps}})" },
          thirtyFps: { en: "30 fps: Low Power Mode or throttling" },
          pointers: {
            title: { en: "Pointers" },
            noneSeen: { en: "Pointers: none seen" },
            counts: { en: "{{pointer}}: {{downs}} down, {{moves}} moves, {{hovers}} hovering" },
            noContact: { en: "no contact" },
            pressure: { en: "pressure {{range}}" },
            landing: { en: "landing {{range}}" },
            contact: { en: "contact {{size}}" },
            perMove: { en: "{{average}} {{events}} a move (most {{most}})" },
            noEvents: { en: "no {{events}} events" }
          },
          byScreen: {
            title: { en: "Slow frames by screen" },
            screen: { en: "{{screen}}: {{slow}} of {{frames}} ({{share}})" }
          },
          untitled: { en: "untitled" },
          slowFrames: {
            all: { en: "All {{kept}} slow frames, oldest first" },
            latest: { en: "The latest {{kept}} of {{slow}} slow frames, oldest first" },
            frame: { en: "{{at}} {{screen}}: {{interval}} (typical {{typical}})" },
            ours: { en: "ours {{ours}}" },
            calls_one: { en: "{{calls}} call" },
            calls_other: { en: "{{calls}} calls" }
          }
        }
      },
      device: {
        title: { en: "Device" },
        copy: { en: "Copy device details" },
        copied: { en: "Copied. Paste it into the chat." },
        notCopied: {
          en: "The device details couldn\u2019t be copied: {{reason}}. They\u2019re below to copy by hand."
        },
        text: { en: "Device details" },
        /** The copied details' first line. */
        taken: { en: "Device details, taken {{time}}" },
        /** The rows, which the performance report repeats: each label and its value's words. */
        userAgent: { label: { en: "User agent" } },
        platform: {
          label: { en: "Platform" },
          none: { en: "none" },
          touchPoints: { en: "{{touchPoints}} touch points" }
        },
        viewport: {
          label: { en: "Viewport" },
          visual: { en: "visual {{size}} at {{offset}}, scale {{scale}}" },
          noVisual: { en: "no visual viewport" }
        },
        screen: {
          label: { en: "Screen" },
          pixelRatio: { en: "at {{pixelRatio}}" }
        },
        safeAreas: { label: { en: "Safe areas" } },
        media: {
          label: { en: "Media" },
          nothing: { en: "nothing" }
        },
        largeScreen: {
          label: { en: "Large screen" },
          yes: { en: "yes" },
          no: { en: "no" }
        }
      }
    },
    /** Your own sticker board. */
    board: {
      /** Your sticker board, top left: screen readers' name for the button with your photo and name, which turns the board over to your stat board */
      yourStats: { en: "{{name}}: your stats", ja: "{{name}}\uFF1A\u3042\u306A\u305F\u306E\u8A18\u9332" },
      /** Your sticker board: the Draw key's visible label; your tickets tuck behind the key's right end */
      draw: { en: "Draw", ja: "\u304B\u304F" },
      /** Your sticker board while a drawing you started waits on the drawing screen: the Draw key's label, and its name for screen readers, which takes you back to it */
      continueDrawing: { en: "Continue drawing", ja: "\u7D9A\u304D\u3092\u304B\u304F" },
      /** Your sticker board: screen readers' name for the Draw key while your tickets haven't loaded */
      drawLabel: { en: "Draw a new sticker", ja: "\u65B0\u3057\u3044\u30B7\u30FC\u30EB\u3092\u304B\u304F" },
      /** Your sticker board: screen readers' name for the Draw key; {{tickets}} names the tickets the next drawing can use, such as "2 daily tickets left" or "no tickets until 12:00 AM" */
      drawLabelWithTickets: {
        en: "Draw a new sticker: {{tickets}}",
        ja: "\u65B0\u3057\u3044\u30B7\u30FC\u30EB\u3092\u304B\u304F\uFF1A{{tickets}}"
      },
      /** Your sticker board with no stickers yet: the nudge beside the Draw key (hidden from screen readers) */
      firstSticker: { en: "Make your first sticker", ja: "\u306F\u3058\u3081\u3066\u306E\u30B7\u30FC\u30EB\u3092\u3064\u304F\u308D\u3046" },
      /** Your sticker board: screen readers' name for the region that holds your stickers */
      label: { en: "Sticker board", ja: "\u30B7\u30FC\u30EB\u30DC\u30FC\u30C9" },
      /** Your sticker board: read out by screen readers when keyboard focus lands on a sticker */
      focusHint: {
        en: "Enter selects it. Arrow keys go to the other stickers.",
        ja: "Enter\u30AD\u30FC\u3067\u9078\u629E\u3057\u307E\u3059\u3002\u77E2\u5370\u30AD\u30FC\u3067\u307B\u304B\u306E\u30B7\u30FC\u30EB\u306B\u79FB\u52D5\u3057\u307E\u3059\u3002"
      },
      /** Your sticker board: read out by screen readers for the selected sticker, listing its keyboard controls */
      selectedHint: {
        en: "Selected. Enter opens it, and Tab reaches its toolbar. Arrow keys move it, [ and ] turn it, minus and plus resize it, Delete takes it off the board, and Escape lets go of it.",
        ja: "\u9078\u629E\u4E2D\u3067\u3059\u3002Enter\u30AD\u30FC\u3067\u3072\u3089\u304D\u3001Tab\u30AD\u30FC\u3067\u30C4\u30FC\u30EB\u30D0\u30FC\u306B\u79FB\u52D5\u3057\u307E\u3059\u3002\u77E2\u5370\u30AD\u30FC\u3067\u52D5\u304B\u3057\u3001[\u30AD\u30FC\u3068]\u30AD\u30FC\u3067\u56DE\u3057\u3001\u30DE\u30A4\u30CA\u30B9\u30AD\u30FC\u3068\u30D7\u30E9\u30B9\u30AD\u30FC\u3067\u5927\u304D\u3055\u3092\u5909\u3048\u3001Delete\u30AD\u30FC\u3067\u30DC\u30FC\u30C9\u304B\u3089\u306F\u304C\u3057\u3001Escape\u30AD\u30FC\u3067\u9078\u629E\u3092\u89E3\u9664\u3057\u307E\u3059\u3002"
      },
      /** Your sticker board with no sticker on it but some in the sticker tray: the note in the dashed spot, pointing to the Zipper */
      blankWithTray: {
        en: "Your stickers are in the tray. Pull the zipper to stick one on.",
        ja: "\u30B7\u30FC\u30EB\u306F<wbr/>\u30B7\u30FC\u30EB\u30C8\u30EC\u30A4\u306E\u4E2D\u3067\u3059\u3002<wbr/>\u30D5\u30A1\u30B9\u30CA\u30FC\u3092\u5F15\u3044\u3066\u3001<wbr/>\u8CBC\u3063\u3066\u307F\u307E\u3057\u3087\u3046\u3002"
      },
      /** Your empty sticker board: the note in the dashed spot where the first sticker lands */
      blank: {
        en: "Stickers you make or receive land here.",
        ja: "\u3064\u304F\u3063\u305F\u30B7\u30FC\u30EB\u3084<wbr/>\u53D7\u3051\u53D6\u3063\u305F\u30B7\u30FC\u30EB\u306F\u3001<wbr/>\u3053\u3053\u306B\u8CBC\u3089\u308C\u307E\u3059\u3002"
      },
      /** Your sticker board while its stickers load: read out to screen readers as faint placeholder stickers show */
      loading: { en: "Loading your stickers", ja: "\u30B7\u30FC\u30EB\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059" },
      /** Your sticker board, when your stickers fail to load: the alert in the dashed spot, before Try again; {{reason}} is why */
      didntLoad: {
        en: "Your stickers didn\u2019t load: {{reason}}",
        ja: "\u30B7\u30FC\u30EB\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
      },
      /** Your sticker board: the alert when gifts waiting for you couldn't load, before Try again; {{reason}} is why */
      giftsDidntLoad: {
        en: "Couldn\u2019t load gifts waiting for you: {{reason}}",
        ja: "\u3042\u306A\u305F\u3078\u306E\u30AE\u30D5\u30C8\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
      },
      /** Your sticker board: the alert, over Try again, when checking whether gratitude is waiting to be sent for the sticker that just arrived failed; {{reason}} why */
      gratitudeCheckFailed: {
        en: "Couldn\u2019t check whether gratitude is waiting to be sent for your newest sticker: {{reason}}",
        ja: "\u3044\u3061\u3070\u3093\u65B0\u3057\u3044\u30B7\u30FC\u30EB\u306B\u611F\u8B1D\u3092\u9001\u308C\u308B\u304B\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
      },
      /** Your sticker board, over the Draw key: the alert when your tickets didn't load, so nothing sits behind Draw, before Try again; Draw asks for them again too; {{reason}} is why */
      ticketsDidntLoad: {
        en: "Couldn\u2019t load your tickets: {{reason}}",
        ja: "\u30C1\u30B1\u30C3\u30C8\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
      },
      /** Your sticker board: the alert when one moved sticker's new position didn't save; {{stickers}} is its number, {{reasons}} why */
      unsaved_one: { en: "Couldn\u2019t save where {{stickers}} sits: {{reasons}}" },
      /** Your sticker board: the alert when moved stickers' new positions didn't save; {{stickers}} lists their numbers, {{reasons}} why */
      unsaved_other: {
        en: "Couldn\u2019t save where {{stickers}} sit: {{reasons}}",
        ja: "{{stickers}}\u306E\u4F4D\u7F6E\u3092\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reasons}}"
      }
    },
    /** A sticker on a board, as screen readers name it: "3 of 6" is its place in reading order. */
    placedSticker: {
      /** Any sticker board: screen readers' role name for each sticker on it, read after its label */
      roleDescription: { en: "sticker", ja: "\u30B7\u30FC\u30EB" },
      /** Any sticker board: screen readers' name for a sticker the board's owner drew; {{position}} of {{setSize}} is its place in reading order */
      label: {
        en: "{{no}}, drawn in {{duration}}, {{position}} of {{setSize}}",
        ja: "{{no}}\u3001\u5236\u4F5C\u6642\u9593{{duration}}\u3001{{setSize}}\u679A\u4E2D{{position}}\u679A\u76EE"
      },
      /** Any sticker board: screen readers' name for a sticker someone other than the board's owner drew; {{artist}} is its Original Artist */
      labelBy: {
        en: "{{no}}, drawn in {{duration}}, by {{artist}}, {{position}} of {{setSize}}",
        ja: "{{no}}\u3001\u5236\u4F5C\u6642\u9593{{duration}}\u3001\u4F5C\u8005\uFF1A{{artist}}\u3001{{setSize}}\u679A\u4E2D{{position}}\u679A\u76EE"
      }
    },
    /** Beside the selected sticker on the board. */
    toolbar: {
      /** Your sticker board, a sticker selected: the toolbar's Give key, which starts giving it through LINE */
      give: { en: "Give", ja: "\u8D08\u308B" },
      /** Your sticker board, a sticker selected: the toolbar's View key, which opens its sticker detail */
      view: { en: "View", ja: "\u898B\u308B" },
      /** Your sticker board, a sticker selected: the toolbar's Remove key, which takes it off the board and back into the sticker tray */
      remove: { en: "Remove", ja: "\u306F\u304C\u3059" },
      /** The toolbar's Arrange tile and the step tiles it opens, which arrange the selected sticker without dragging it: each names what one press does. */
      arrange: {
        /** Your sticker board, a sticker selected: the toolbar's Arrange tile, which shows or hides the step tiles, and screen readers' name for their group */
        label: { en: "Arrange", ja: "\u914D\u7F6E\u3092\u5909\u3048\u308B" },
        /** Your sticker board, a sticker selected: the arrange button that moves it a step to the left */
        left: { en: "Move left", ja: "\u5DE6\u3078\u52D5\u304B\u3059" },
        /** Your sticker board, a sticker selected: the arrange button that moves it a step to the right */
        right: { en: "Move right", ja: "\u53F3\u3078\u52D5\u304B\u3059" },
        /** Your sticker board, a sticker selected: the arrange button that moves it a step up */
        up: { en: "Move up", ja: "\u4E0A\u3078\u52D5\u304B\u3059" },
        /** Your sticker board, a sticker selected: the arrange button that moves it a step down */
        down: { en: "Move down", ja: "\u4E0B\u3078\u52D5\u304B\u3059" },
        /** Your sticker board, a sticker selected: the arrange button that makes it a step smaller */
        smaller: { en: "Smaller", ja: "\u5C0F\u3055\u304F\u3059\u308B" },
        /** Your sticker board, a sticker selected: the arrange button that makes it a step bigger */
        bigger: { en: "Bigger", ja: "\u5927\u304D\u304F\u3059\u308B" },
        /** Your sticker board, a sticker selected: the arrange button that turns it a step counterclockwise */
        turnLeft: { en: "Turn left", ja: "\u5DE6\u306B\u56DE\u3059" },
        /** Your sticker board, a sticker selected: the arrange button that turns it a step clockwise */
        turnRight: { en: "Turn right", ja: "\u53F3\u306B\u56DE\u3059" },
        /** What the last of a run of steps did, read out by screen readers once the run settles. */
        moved: {
          /** Your sticker board, a sticker selected: read out once its steps settle, the last having moved it left */
          left: { en: "Moved left", ja: "\u5DE6\u3078\u52D5\u304B\u3057\u307E\u3057\u305F" },
          /** Your sticker board, a sticker selected: read out once its steps settle, the last having moved it right */
          right: { en: "Moved right", ja: "\u53F3\u3078\u52D5\u304B\u3057\u307E\u3057\u305F" },
          /** Your sticker board, a sticker selected: read out once its steps settle, the last having moved it up */
          up: { en: "Moved up", ja: "\u4E0A\u3078\u52D5\u304B\u3057\u307E\u3057\u305F" },
          /** Your sticker board, a sticker selected: read out once its steps settle, the last having moved it down */
          down: { en: "Moved down", ja: "\u4E0B\u3078\u52D5\u304B\u3057\u307E\u3057\u305F" },
          /** Your sticker board, a sticker selected: read out once its steps settle, the last having made it smaller */
          smaller: { en: "Made smaller", ja: "\u5C0F\u3055\u304F\u3057\u307E\u3057\u305F" },
          /** Your sticker board, a sticker selected: read out once its steps settle, the last having made it bigger */
          bigger: { en: "Made bigger", ja: "\u5927\u304D\u304F\u3057\u307E\u3057\u305F" },
          /** Your sticker board, a sticker selected: read out once its steps settle, the last having turned it counterclockwise */
          turnLeft: { en: "Turned left", ja: "\u5DE6\u306B\u56DE\u3057\u307E\u3057\u305F" },
          /** Your sticker board, a sticker selected: read out once its steps settle, the last having turned it clockwise */
          turnRight: { en: "Turned right", ja: "\u53F3\u306B\u56DE\u3057\u307E\u3057\u305F" }
        },
        /** What stopped the last of a run of steps from changing anything, read out once the run settles. Nothing stops a turn. */
        stopped: {
          /** Your sticker board, a sticker selected: read out once its steps settle, the last having met the board's left edge */
          left: { en: "It's at the left edge", ja: "\u5DE6\u7AEF\u3067\u3059" },
          /** Your sticker board, a sticker selected: read out once its steps settle, the last having met the board's right edge */
          right: { en: "It's at the right edge", ja: "\u53F3\u7AEF\u3067\u3059" },
          /** Your sticker board, a sticker selected: read out once its steps settle, the last having met the board's top edge */
          up: { en: "It's at the top edge", ja: "\u4E0A\u7AEF\u3067\u3059" },
          /** Your sticker board, a sticker selected: read out once its steps settle, the last having met the board's bottom edge */
          down: { en: "It's at the bottom edge", ja: "\u4E0B\u7AEF\u3067\u3059" },
          /** Your sticker board, a sticker selected: read out once its steps settle, the last having met the smallest a sticker goes */
          smaller: { en: "It's as small as it goes", ja: "\u3053\u308C\u4EE5\u4E0A\u5C0F\u3055\u304F\u3067\u304D\u307E\u305B\u3093" },
          /** Your sticker board, a sticker selected: read out once its steps settle, the last having met the biggest a sticker goes */
          bigger: { en: "It's as big as it goes", ja: "\u3053\u308C\u4EE5\u4E0A\u5927\u304D\u304F\u3067\u304D\u307E\u305B\u3093" }
        }
      }
    },
    /** The sticker tray, zipped down the board's right edge. */
    tray: {
      /** Your sticker board: screen readers' name for the Zipper's pull down the right edge, which opens the sticker tray */
      zipper: { en: "Your stickers", ja: "\u624B\u6301\u3061\u306E\u30B7\u30FC\u30EB" },
      /** Sticker tray, before any sticker: the note printed on its one blank sheet */
      empty: {
        en: "Stickers you make or receive collect here",
        ja: "\u3064\u304F\u3063\u305F\u30B7\u30FC\u30EB\u3084<wbr/>\u53D7\u3051\u53D6\u3063\u305F\u30B7\u30FC\u30EB\u304C<wbr/>\u3053\u3053\u306B\u305F\u307E\u308A\u307E\u3059"
      },
      /** Sticker tray: screen readers' name for the stack of sticker sheets */
      sheets: { en: "Your sticker sheets", ja: "\u624B\u6301\u3061\u306E\u30B7\u30FC\u30EB\u30B7\u30FC\u30C8" },
      /** Sticker tray: screen readers' name for the folder tabs (All, Mine, Gifts), which pick the stickers shown; the tabs show once the tray holds a gift */
      tabs: { en: "Show", ja: "\u8868\u793A\u3059\u308B\u30B7\u30FC\u30EB" },
      filters: {
        /** Sticker tray: the folder tab that shows every sticker */
        all: { en: "All", ja: "\u3059\u3079\u3066" },
        /** Sticker tray: the folder tab that shows only the stickers you drew */
        mine: { en: "Mine", ja: "\u81EA\u4F5C" },
        /** Sticker tray: the folder tab that shows only the stickers you received */
        gifts: { en: "Gifts", ja: "\u30AE\u30D5\u30C8" }
      },
      /** Sticker tray: the badge on a sticker the open tray hasn't shown before (hidden from screen readers) */
      new: { en: "NEW", ja: "NEW" },
      slot: {
        /** Sticker tray: screen readers' name for a used sticker silhouette, whose sticker is on the board; a tap makes that sticker pulse there */
        used: {
          en: "{{no}}, on your board. Show it",
          ja: "{{no}}\u3001\u30DC\u30FC\u30C9\u306B\u8CBC\u3063\u3066\u3042\u308A\u307E\u3059\u3002\u30DC\u30FC\u30C9\u3067\u898B\u308B"
        },
        /** Sticker tray, the sheet in front: screen readers' name for a sticker on it; the sheet's description says what to do with it */
        onSheet: { en: "{{no}}", ja: "{{no}}" },
        /** Sticker tray: screen readers' name for a used sticker silhouette whose sticker just arrived on the board and the tray hasn't shown before */
        usedNew: {
          en: "{{no}}, new, on your board. Show it",
          ja: "{{no}}\u3001\u65B0\u7740\u3001\u30DC\u30FC\u30C9\u306B\u8CBC\u3063\u3066\u3042\u308A\u307E\u3059\u3002\u30DC\u30FC\u30C9\u3067\u898B\u308B"
        },
        /** Sticker tray, the sheet in front: screen readers' name for a sticker on it that the tray hasn't shown before */
        newOnSheet: { en: "{{no}}, new", ja: "{{no}}\u3001\u65B0\u7740" },
        /** Sticker tray: screen readers' name for the spot a sticker you gave left on its sheet, a button that opens it among the stickers you gave; {{recipient}} is who received it, such as "@bob" */
        given: {
          en: "{{no}}, given to {{recipient}}. Open it",
          ja: "{{no}}\u3001{{recipient}}\u3055\u3093\u3078\u8D08\u3063\u305F\u30B7\u30FC\u30EB\u3092\u3072\u3089\u304F"
        },
        /** Sticker tray: screen readers' name for the spot of a sticker packed in a gift you haven't sent yet, a button that opens it among your stickers */
        inTheBag: { en: "{{no}}, in the bag. Open it", ja: "{{no}}\u3001\u30AE\u30D5\u30C8\u888B\u306B\u5165\u308C\u305F\u30B7\u30FC\u30EB\u3092\u3072\u3089\u304F" },
        /** Sticker tray: screen readers' name for the spot of a sticker you sent that no one has received yet, a button that opens it among your stickers */
        onItsWay: { en: "{{no}}, on its way. Open it", ja: "{{no}}\u3001\u304A\u5C4A\u3051\u4E2D\u306E\u30B7\u30FC\u30EB\u3092\u3072\u3089\u304F" },
        /** Sticker tray: screen readers' name for the spot of a sticker you sent to someone that they haven't received yet, a button that opens it among your stickers; {{recipient}} is who it waits for, such as "@bob" */
        onItsWayTo: {
          en: "{{no}}, on its way to {{recipient}}. Open it",
          ja: "{{no}}\u3001{{recipient}}\u3055\u3093\u3078\u304A\u5C4A\u3051\u4E2D\u306E\u30B7\u30FC\u30EB\u3092\u3072\u3089\u304F"
        }
      },
      /** Sticker tray: screen readers' name for the +1 button under the stack, which spreads every sheet out over the board */
      moreSheets_one: { en: "{{count}} more sheet. Spread every sheet out" },
      /** Sticker tray: screen readers' name for the +N button under the stack, which spreads every sheet out over the board */
      moreSheets_other: {
        en: "{{count}} more sheets. Spread every sheet out",
        ja: "\u307B\u304B\u306B{{count}}\u679A\u306E\u30B7\u30FC\u30C8\u3002\u3059\u3079\u3066\u306E\u30B7\u30FC\u30C8\u3092\u5E83\u3052\u308B"
      },
      /** Sticker tray: screen readers' name for a sheet behind the front one, or one laid out in the spread; {{dates}} is when its stickers came, such as "9.20–9.23" */
      sheet: {
        en: "Sheet {{number}}, {{dates}}. Bring it to the front",
        ja: "\u30B7\u30FC\u30C8{{number}}\u3001{{dates}}\u3002\u624B\u524D\u306B\u51FA\u3059"
      },
      /** Sticker tray, the sheet in front: what screen readers say about it after its name, once for every sticker on it */
      slotHint: {
        en: "Drag a sticker onto your board, or tap it to stick it on",
        ja: "\u30B7\u30FC\u30EB\u306F\u30DC\u30FC\u30C9\u3078\u30C9\u30E9\u30C3\u30B0\u3059\u308B\u304B\u3001\u30BF\u30C3\u30D7\u3059\u308B\u3068\u8CBC\u308C\u307E\u3059"
      },
      /** Sticker tray: screen readers' name for the sheet in front, which holds the stickers you can stick on; {{dates}} is when its stickers came, such as "9.20–9.23" */
      frontSheet: {
        en: "Sheet {{number}}, {{dates}}, in front",
        ja: "\u30B7\u30FC\u30C8{{number}}\u3001{{dates}}\u3001\u624B\u524D"
      },
      /** Sticker tray, before any sticker: screen readers' name for its one blank sheet in front, which has no dates yet */
      frontSheet_noDates: { en: "Sheet {{number}}, in front", ja: "\u30B7\u30FC\u30C8{{number}}\u3001\u624B\u524D" },
      /** Sticker tray: screen readers' name for the sheet pulled out over the board; {{dates}} is when its stickers came, such as "9.20–9.23" */
      pulledSheet: {
        en: "Sheet {{number}}, {{dates}}, pulled out",
        ja: "\u30B7\u30FC\u30C8{{number}}\u3001{{dates}}\u3001\u5F15\u304D\u51FA\u3057\u4E2D"
      },
      /** Sticker tray, before any sticker: screen readers' name for its one blank sheet pulled out over the board, which has no dates yet */
      pulledSheet_noDates: { en: "Sheet {{number}}, pulled out", ja: "\u30B7\u30FC\u30C8{{number}}\u3001\u5F15\u304D\u51FA\u3057\u4E2D" },
      /** Sticker tray, sheets spread over the board: screen readers' name for the dialog that holds every sheet, one button each */
      spread: { en: "Your sticker sheets, spread out", ja: "\u5E83\u3052\u305F\u624B\u6301\u3061\u306E\u30B7\u30FC\u30EB\u30B7\u30FC\u30C8" },
      /** Sticker tray, sheets spread over the board: screen readers' name for the sheet that's in front now */
      sheetInFront: {
        en: "Sheet {{number}}, {{dates}}, in front now. Bring it to the front",
        ja: "\u30B7\u30FC\u30C8{{number}}\u3001{{dates}}\u3001\u3044\u307E\u624B\u524D\u306B\u3042\u308A\u307E\u3059\u3002\u624B\u524D\u306B\u51FA\u3059"
      },
      /** Sticker tray: screen readers' name for the X on a sheet pulled out over the board */
      putBack: { en: "Put this sheet back in the tray", ja: "\u3053\u306E\u30B7\u30FC\u30C8\u3092\u30B7\u30FC\u30EB\u30C8\u30EC\u30A4\u306B\u623B\u3059" },
      /** Your sticker board: the alert above Draw when the sticker tray couldn't do something, one line for each. */
      problem: {
        /** Your sticker board's alert: a sticker couldn't be stuck on from its sheet, so it stays there; {{stickers}} is its number, such as "No.0147", and {{reason}} why */
        place: {
          en: "Couldn\u2019t stick {{stickers}} on the board, so it stays in its sheet: {{reason}}",
          ja: "{{stickers}}\u3092\u30DC\u30FC\u30C9\u306B\u8CBC\u308C\u306A\u304B\u3063\u305F\u306E\u3067\u3001\u30B7\u30FC\u30C8\u306B\u6B8B\u308A\u307E\u3059\uFF1A{{reason}}"
        },
        /** Your sticker board's alert: a sticker's cut line couldn't be read, so its sheet packs it as a box, over the English words for a report; {{stickers}} is its number, such as "No.0147" */
        cut: {
          en: "Couldn\u2019t read the cut line of {{stickers}}, so its sheet packs it as a box.",
          ja: "{{stickers}}\u306E\u5207\u308A\u629C\u304D\u7DDA\u3092\u8AAD\u307F\u53D6\u308C\u306A\u304B\u3063\u305F\u305F\u3081\u3001\u30B7\u30FC\u30C8\u306B\u306F\u56DB\u89D2\u3067\u4E26\u3079\u307E\u3057\u305F\u3002"
        },
        /** Your sticker board's alert: the sticker tray couldn't save which stickers it showed; {{stickers}} lists their numbers, such as "No.0147", and {{reason}} why */
        seen: {
          en: "Couldn\u2019t save that the tray showed {{stickers}}, so NEW may show on them again: {{reason}}",
          ja: "{{stickers}}\u3092\u898B\u305F\u3053\u3068\u3092\u4FDD\u5B58\u3067\u304D\u306A\u304B\u3063\u305F\u305F\u3081\u3001NEW\u304C\u307E\u305F\u8868\u793A\u3055\u308C\u308B\u3053\u3068\u304C\u3042\u308A\u307E\u3059\uFF1A{{reason}}"
        },
        /** Your sticker board's alert about the sticker tray: why a sticker couldn't be stuck on when the board can't take it yet */
        boardNotReady: {
          en: "the board isn\u2019t ready for it yet",
          ja: "\u30DC\u30FC\u30C9\u306E\u6E96\u5099\u304C\u307E\u3060\u3067\u304D\u3066\u3044\u307E\u305B\u3093"
        },
        /** Your sticker board's alert about the sticker tray: the key that clears it */
        dismiss: { en: "Dismiss", ja: "\u9589\u3058\u308B" }
      },
      /** Sticker tray: what screen readers are told as the tray changes, in one status line. */
      status: {
        /** Sticker tray, after a folder tab is chosen: what screen readers are told; {{filter}} is the tab's name, such as "Gifts", and {{count}} is how many sheets it shows */
        filtered_one: { en: "{{filter}}: {{count}} sheet" },
        /** Sticker tray, after a folder tab is chosen: what screen readers are told; {{filter}} is the tab's name, such as "Gifts", and {{count}} is how many sheets it shows */
        filtered_other: { en: "{{filter}}: {{count}} sheets", ja: "{{filter}}\uFF1A{{count}}\u679A\u306E\u30B7\u30FC\u30C8" },
        /** Sticker tray, after a sticker is stuck on the board from a sheet: what screen readers are told; {{no}} is its number, such as "No.0147" */
        stuckOn: { en: "{{no}} is on your board", ja: "{{no}}\u3092\u30DC\u30FC\u30C9\u306B\u8CBC\u308A\u307E\u3057\u305F" },
        /** Sticker tray, after a board sticker goes back into its sheet: what screen readers are told; {{no}} is its number, such as "No.0147"; and the sticker detail, once Take it out landed and the sticker is back in your sticker tray */
        returned: { en: "{{no}} is back in your tray", ja: "{{no}}\u3092\u30C8\u30EC\u30A4\u306B\u623B\u3057\u307E\u3057\u305F" }
      }
    },
    /** One sticker large, paging through the rest. */
    detail: {
      /** Sticker detail: screen readers' name for the screen when it has no sticker to show */
      label: { en: "Sticker", ja: "\u30B7\u30FC\u30EB" },
      /** Sticker detail, opened from a sticker you hold: screen readers' name for the strip of sticker thumbnails at the top */
      yourStickers: { en: "Your stickers", ja: "\u624B\u6301\u3061\u306E\u30B7\u30FC\u30EB" },
      /** Sticker detail, opened from a given sticker's spot in the sticker tray: screen readers' name for the strip of thumbnails of the stickers you gave */
      stickersYouGave: { en: "Stickers you gave", ja: "\u8D08\u3063\u305F\u30B7\u30FC\u30EB" },
      /** Sticker detail: screen readers' name for the left arrow under the sticker, which pages to the previous one */
      previous: { en: "Previous sticker", ja: "\u524D\u306E\u30B7\u30FC\u30EB" },
      /** Sticker detail: screen readers' name for the right arrow under the sticker, which pages to the next one */
      next: { en: "Next sticker", ja: "\u6B21\u306E\u30B7\u30FC\u30EB" },
      /** Sticker detail: the page count between the arrows, such as "3 / 6" (hidden from screen readers) */
      count: { en: "{{position}} / {{setSize}}", ja: "{{position}} / {{setSize}}" },
      /** Sticker detail: what screen readers announce after paging, naming the sticker and its place */
      countSpoken: {
        en: "{{no}}, {{position}} of {{setSize}}",
        ja: "{{no}}\u3001{{setSize}}\u679A\u4E2D{{position}}\u679A\u76EE"
      },
      /** Sticker detail: the sticker's heading under the pager; <no/> is its number, such as "No.0012" */
      title: { en: "Sticker <no/>", ja: "\u30B7\u30FC\u30EB<no/>" },
      /** Sticker detail, a sticker the board's owner drew: the fine print naming its Original Artist, first on the line and ending in the separator before the drawing time; <artist/> is their handle, which keeps its own case in the capitals */
      by: { en: "by <artist/> \xB7", ja: "\u4F5C\u8005\uFF1A<artist/>\u30FB" },
      /** Sticker detail: the fine print with how long it took to draw, such as "4m 52s", after the artist or first on the line when the artist chip names them */
      drawnIn: { en: "drawn in <duration/>", ja: "\u5236\u4F5C\u6642\u9593<duration/>" },
      /** Sticker detail: the fine print ending the artist line, the day it was sealed, such as "2026.09.23" */
      sealedOn: { en: "\xB7 {{day}}", ja: "\u30FB{{day}}" },
      /** Sticker detail, a sticker you gave: the fine print naming who received it and when, until its Transfer Trail loads; <receiver/> is their handle, which keeps its own case in the capitals */
      youGaveIt: {
        en: "You gave it to <receiver/> \xB7 {{day}}",
        ja: "<receiver/>\u3055\u3093\u306B\u8D08\u308A\u307E\u3057\u305F\u30FB{{day}}"
      },
      /** Sticker detail, a sticker you've sent that hasn't been received: the note in place of Give, beside its sleeve */
      onItsWay: { en: "On its way", ja: "\u304A\u5C4A\u3051\u4E2D" },
      /** Sticker detail, a sticker you've sent to someone in the app that hasn't been received: the note in place of Give, beside its sleeve */
      onItsWayTo: { en: "On its way to {{receiver}}", ja: "{{receiver}}\u3055\u3093\u3078\u304A\u5C4A\u3051\u4E2D" },
      /** Take it out, on the detail of a sticker in a gift you sent or packed. */
      takeOut: {
        /** Sticker detail, a sticker you sent: the in-place confirm Take it out opens, its title; {{no}} is its number, such as "No.0147" */
        title: { en: "Take {{no}} out?", ja: "{{no}}\u3092\u53D6\u308A\u51FA\u3057\u307E\u3059\u304B\uFF1F" },
        /** Sticker detail, Take it out's confirm: the quiet link that closes it with nothing taken out */
        cancel: { en: "Cancel", ja: "\u30AD\u30E3\u30F3\u30BB\u30EB" },
        /** Sticker detail: said to screen readers once Take it out landed and the sticker is back on your board; {{no}} is its number */
        backOnBoard: { en: "{{no}} is back on your board", ja: "{{no}}\u3092\u30DC\u30FC\u30C9\u306B\u623B\u3057\u307E\u3057\u305F" }
      },
      /** Sticker detail, a sticker you received and haven't sent gratitude for: the pink key that opens the Gratitude Mini-game */
      sendGratitude: { en: "Send gratitude", ja: "\u611F\u8B1D\u3092\u9001\u308B" },
      /** Sticker detail, a sticker you hold: the Give key, or the smaller Give button under Send gratitude */
      give: { en: "Give", ja: "\u8D08\u308B" },
      /** Sticker detail: the alert when its Transfer Trail and gratitude check fail to load, before Try again */
      checkFailed: {
        en: "Couldn\u2019t load where it\u2019s been, or whether you\u2019ve sent gratitude for it: {{reason}}",
        ja: "\u6765\u6B74\u3068\u3001\u611F\u8B1D\u3092\u9001\u3063\u305F\u304B\u3069\u3046\u304B\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
      },
      /** Sticker detail, beside the alert that says the server refused gratitude you sent for it (the reasons are the Gratitude Mini-game receipt's): the link that clears the alert */
      dismiss: { en: "Dismiss", ja: "\u9589\u3058\u308B" },
      /** Sticker detail: in place of the sticker when there's none to show */
      none: { en: "No sticker here yet.", ja: "\u307E\u3060\u30B7\u30FC\u30EB\u304C\u3042\u308A\u307E\u305B\u3093\u3002" },
      /** Mark 18+, at the foot of the detail of a sticker you drew that isn't 18+ yet, and the confirm it opens. */
      markNsfw: {
        /** Sticker detail, a sticker you drew that isn't 18+: the button in its own section at the detail's foot, past a rule, that opens the confirm to mark it 18+ */
        open: { en: "Mark 18+\u2026", ja: "18+\u306B\u3059\u308B\u2026" },
        /** Sticker detail, Mark 18+'s confirm: its title; {{no}} is the sticker's number, such as "No.0147" */
        title: { en: "Mark {{no}} 18+?", ja: "{{no}}\u309218+\u306B\u3057\u307E\u3059\u304B\uFF1F" },
        /** Sticker detail, Mark 18+'s confirm: what marking does */
        does: {
          en: "From now on it wears pink foil, and anyone who hasn\u2019t turned on Show 18+ stickers sees it blurred and can\u2019t receive it.",
          ja: "\u3053\u308C\u304B\u3089\u306F\u30D4\u30F3\u30AF\u306E\u30DB\u30A4\u30EB\u304C\u3064\u304D\u3001\u300C18+\u306E\u30B7\u30FC\u30EB\u3092\u8868\u793A\u3059\u308B\u300D\u3092\u30AA\u30F3\u306B\u3057\u3066\u3044\u306A\u3044\u4EBA\u306B\u306F\u307C\u304B\u3057\u3066\u8868\u793A\u3055\u308C\u3001\u53D7\u3051\u53D6\u308B\u3053\u3068\u3082\u3067\u304D\u306A\u304F\u306A\u308A\u307E\u3059\u3002"
        },
        /** Sticker detail, Mark 18+'s confirm: the line saying the mark can't call back copies of the drawing people already saw */
        copies: {
          en: "Anyone who has already seen it may have kept a copy.",
          ja: "\u3059\u3067\u306B\u898B\u305F\u4EBA\u306E\u624B\u5143\u306B\u3001\u30B3\u30D4\u30FC\u304C\u6B8B\u3063\u3066\u3044\u308B\u304B\u3082\u3057\u308C\u307E\u305B\u3093\u3002"
        },
        /** Sticker detail, Mark 18+'s confirm: the quiet link that closes it with nothing marked */
        cancel: { en: "Cancel", ja: "\u30AD\u30E3\u30F3\u30BB\u30EB" },
        /** Sticker detail, Mark 18+'s confirm: the red button that marks the sticker 18+ */
        confirm: { en: "Mark 18+", ja: "18+\u306B\u3059\u308B" },
        /** Sticker detail, Mark 18+'s confirm: the red button's words while the mark is on its way to the server */
        sending: { en: "Marking\u2026", ja: "18+\u306B\u3057\u3066\u3044\u307E\u3059\u2026" },
        /** Sticker detail, Mark 18+'s confirm: the alert under it when the mark failed or was refused, kept on that sticker as it pages; {{no}} is the sticker's number, before the reason */
        failed: {
          en: "Couldn\u2019t mark {{no}} 18+: {{reason}}",
          ja: "{{no}}\u309218+\u306B\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
        },
        /** Sticker detail: the status line at its foot once the mark lands, for someone with Show 18+ stickers on; {{no}} is the sticker's number */
        done: { en: "{{no}} is marked 18+.", ja: "{{no}}\u309218+\u306B\u3057\u307E\u3057\u305F\u3002" },
        /** Sticker detail: the status line at its foot once the mark lands, for someone without Show 18+ stickers on, who now sees it blurred; {{no}} is the sticker's number */
        doneBlurred: {
          en: "{{no}} is marked 18+. Show 18+ stickers in Settings shows it unblurred.",
          ja: "{{no}}\u309218+\u306B\u3057\u307E\u3057\u305F\u3002\u8A2D\u5B9A\u306E\u300C18+\u306E\u30B7\u30FC\u30EB\u3092\u8868\u793A\u3059\u308B\u300D\u3092\u30AA\u30F3\u306B\u3059\u308B\u3068\u3001\u307C\u304B\u3057\u306A\u3057\u3067\u8868\u793A\u3055\u308C\u307E\u3059\u3002"
        }
      },
      /** Remove 18+, at the foot of the detail of an 18+ sticker you drew, where Mark 18+ was, and the confirm it opens. */
      unmarkNsfw: {
        /** Sticker detail, an 18+ sticker you drew: the button in its own section at the detail's foot, past a rule, that opens the confirm to take its 18+ mark off */
        open: { en: "Remove 18+\u2026", ja: "18+\u3092\u5916\u3059\u2026" },
        /** Sticker detail, Remove 18+'s confirm: its title; {{no}} is the sticker's number, such as "No.0147" */
        title: { en: "Remove 18+ from {{no}}?", ja: "{{no}}\u306E18+\u3092\u5916\u3057\u307E\u3059\u304B\uFF1F" },
        /** Sticker detail, Remove 18+'s confirm: what taking the mark off does */
        does: {
          en: "Its pink foil comes off, and everyone sees it unblurred and can receive it.",
          ja: "\u30D4\u30F3\u30AF\u306E\u30DB\u30A4\u30EB\u304C\u5916\u308C\u3001\u3060\u308C\u306B\u3067\u3082\u307C\u304B\u3057\u306A\u3057\u3067\u8868\u793A\u3055\u308C\u3001\u3060\u308C\u3067\u3082\u53D7\u3051\u53D6\u308C\u308B\u3088\u3046\u306B\u306A\u308A\u307E\u3059\u3002"
        },
        /** Sticker detail, Remove 18+'s confirm: the quiet link that closes it with the mark left on */
        cancel: { en: "Cancel", ja: "\u30AD\u30E3\u30F3\u30BB\u30EB" },
        /** Sticker detail, Remove 18+'s confirm: the red button that takes the 18+ mark off */
        confirm: { en: "Remove 18+", ja: "18+\u3092\u5916\u3059" },
        /** Sticker detail, Remove 18+'s confirm: the red button's words while the removal is on its way to the server */
        sending: { en: "Removing\u2026", ja: "18+\u3092\u5916\u3057\u3066\u3044\u307E\u3059\u2026" },
        /** Sticker detail, Remove 18+'s confirm: the alert under it when the removal failed or was refused, kept on that sticker as it pages; {{no}} is the sticker's number, before the reason and Try again */
        failed: {
          en: "Couldn\u2019t remove 18+ from {{no}}: {{reason}}",
          ja: "{{no}}\u306E18+\u3092\u5916\u305B\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
        },
        /** Sticker detail: the status line at its foot once the 18+ mark is off; {{no}} is the sticker's number */
        done: { en: "{{no}} is no longer 18+.", ja: "{{no}}\u306E18+\u3092\u5916\u3057\u307E\u3057\u305F\u3002" }
      }
    },
    /** The sticker detail's timelapse, which plays how the sticker was drawn. */
    timelapse: {
      /** Sticker detail: the Timelapse button at the end of the fine print, which plays how the sticker was drawn */
      watch: { en: "Timelapse", ja: "\u30BF\u30A4\u30E0\u30E9\u30D7\u30B9" },
      /** Sticker detail: the Timelapse button while the timelapse loads */
      loading: { en: "Loading\u2026", ja: "\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026" },
      /** Sticker detail: the Timelapse button while it gets the timelapse's fills ready */
      preparing: { en: "Preparing\u2026", ja: "\u6E96\u5099\u4E2D\u2026" },
      /** Sticker detail: the Timelapse button while the timelapse plays; a tap shows the finished sticker at once */
      skip: { en: "Skip", ja: "\u30B9\u30AD\u30C3\u30D7" },
      /** Sticker detail: screen readers' name for the Timelapse button; {{no}} is the sticker's number, such as "No.0012" */
      watchLabel: {
        en: "Timelapse: watch {{no}} being drawn",
        ja: "\u30BF\u30A4\u30E0\u30E9\u30D7\u30B9\uFF1A{{no}}\u3092\u304B\u304F\u69D8\u5B50\u3092\u898B\u308B"
      },
      /** Sticker detail: screen readers' name for Skip while the timelapse plays */
      skipLabel: { en: "Skip to the end", ja: "\u6700\u5F8C\u307E\u3067\u30B9\u30AD\u30C3\u30D7" },
      /** Sticker detail: read out as the timelapse starts; {{no}} is the sticker's number */
      playing: { en: "Playing how {{no}} was drawn", ja: "{{no}}\u3092\u304B\u3044\u305F\u69D8\u5B50\u3092\u518D\u751F\u3057\u3066\u3044\u307E\u3059" },
      /** Sticker detail: read out when the timelapse ends */
      done: { en: "Done", ja: "\u518D\u751F\u304C\u7D42\u308F\u308A\u307E\u3057\u305F" },
      /** Sticker detail: the alert under the fine print when the timelapse fails to load or play, before Try again */
      failed: {
        en: "Couldn\u2019t load the timelapse: {{reason}}",
        ja: "\u30BF\u30A4\u30E0\u30E9\u30D7\u30B9\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
      },
      /** Sticker detail: the timelapse alert's reason when this device couldn't play it; the player's own English words follow as details for a report */
      notPlayed: {
        en: "It couldn\u2019t play here.",
        ja: "\u3053\u306E\u7AEF\u672B\u3067\u306F\u518D\u751F\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002"
      }
    },
    /** Where a sticker has been: one row per time it was given, newest first. */
    transferTrail: {
      /** Sticker detail: screen readers' name for the Transfer Trail section under the sticker */
      label: { en: "Where it\u2019s been", ja: "\u6765\u6B74" },
      /** Sticker detail, while it's read: screen readers' status line for the Transfer Trail's placeholder rows */
      loading: { en: "Loading where it\u2019s been", ja: "\u6765\u6B74\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059" },
      /** A row: `<giver/>` and `<receiver/>` are their names, and `<at>` holds the day. */
      handOff: {
        /** Transfer Trail: a row for a gift between two other people; <at> holds the day, such as "9.23" */
        between: {
          en: "<giver/> gave it to <receiver/><at> \xB7 {{day}}</at>",
          ja: "<giver/>\u3055\u3093\u304C<receiver/>\u3055\u3093\u306B\u8D08\u308A\u307E\u3057\u305F<at>\u30FB{{day}}</at>"
        },
        /** Transfer Trail: a row for a gift you gave; <at> holds the day */
        byYou: {
          en: "<b>You</b> gave it to <receiver/><at> \xB7 {{day}}</at>",
          ja: "<b>\u3042\u306A\u305F</b>\u304C<receiver/>\u3055\u3093\u306B\u8D08\u308A\u307E\u3057\u305F<at>\u30FB{{day}}</at>"
        },
        /** Transfer Trail: a row for a gift you received; <at> holds the day */
        toYou: {
          en: "<giver/> gave it to <b>you</b><at> \xB7 {{day}}</at>",
          ja: "<giver/>\u3055\u3093\u304C<b>\u3042\u306A\u305F</b>\u306B\u8D08\u308A\u307E\u3057\u305F<at>\u30FB{{day}}</at>"
        }
      },
      /** Transfer Trail: a closed row's gratitude amount beside a heart; the <hidden> words are for screen readers only */
      amount: { en: "{{amount}}<hidden> gratitude</hidden>", ja: "<hidden>\u611F\u8B1D</hidden>{{amount}}" },
      /** Transfer Trail, the open row: under the gratitude total, when you sent it */
      fromYou: { en: "From you", ja: "\u3042\u306A\u305F\u304B\u3089" },
      /** Transfer Trail, the open row: under the gratitude total, naming who sent it; <name/> is their handle, which keeps its own case in the capitals */
      from: { en: "From <name/>", ja: "<name/>\u3055\u3093\u304B\u3089" },
      /** Transfer Trail, the open row: the Replay button beside the gratitude total, which plays the combo inside the card */
      replay: { en: "Replay", ja: "\u30EA\u30D7\u30EC\u30A4" },
      /** Transfer Trail, the open row: screen readers' name for Replay when you sent the gratitude */
      replayYours: {
        en: "Play the replay of your {{amount}} gratitude",
        ja: "\u3042\u306A\u305F\u304C\u9001\u3063\u305F\u611F\u8B1D{{amount}}\u306E\u30EA\u30D7\u30EC\u30A4\u3092\u518D\u751F"
      },
      /** Transfer Trail, the open row: screen readers' name for Replay when someone else sent the gratitude */
      replayTheirs: {
        en: "Play the replay of {{name}}\u2019s {{amount}} gratitude",
        ja: "{{name}}\u3055\u3093\u304C\u9001\u3063\u305F\u611F\u8B1D{{amount}}\u306E\u30EA\u30D7\u30EC\u30A4\u3092\u518D\u751F"
      },
      /** The open row while its gratitude replays inside it. */
      replaying: {
        /** Transfer Trail, the open row: the Replay button while the replay plays, which stops it */
        stop: { en: "Stop", ja: "\u505C\u6B62" },
        /** Transfer Trail, the open row: screen readers' name for Stop while the replay plays */
        stopLabel: { en: "Stop the replay", ja: "\u30EA\u30D7\u30EC\u30A4\u3092\u505C\u6B62" },
        /** Transfer Trail, the open row: read out as the replay of gratitude you sent starts; {{amount}} is its total */
        yours: {
          en: "Replaying your {{amount}} gratitude",
          ja: "\u3042\u306A\u305F\u304C\u9001\u3063\u305F\u611F\u8B1D{{amount}}\u3092\u30EA\u30D7\u30EC\u30A4\u3057\u3066\u3044\u307E\u3059"
        },
        /** Transfer Trail, the open row: read out as the replay of someone else's gratitude starts; {{name}} sent it */
        theirs: {
          en: "Replaying {{name}}\u2019s {{amount}} gratitude",
          ja: "{{name}}\u3055\u3093\u304C\u9001\u3063\u305F\u611F\u8B1D{{amount}}\u3092\u30EA\u30D7\u30EC\u30A4\u3057\u3066\u3044\u307E\u3059"
        },
        /** Transfer Trail, the open row: read out when the replayed heart has landed in its dot */
        ended: { en: "Replay ended", ja: "\u30EA\u30D7\u30EC\u30A4\u304C\u7D42\u308F\u308A\u307E\u3057\u305F" },
        /** Transfer Trail, the open row: the alert under the card when the replay fails to load, before Try again */
        didntLoad: {
          en: "Couldn\u2019t load the replay: {{reason}}",
          ja: "\u30EA\u30D7\u30EC\u30A4\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
        },
        /** Transfer Trail, the open row: the alert when the replay fails while it plays; the Mini-game engine's English error follows as details for a report */
        stopped: { en: "The replay stopped.", ja: "\u30EA\u30D7\u30EC\u30A4\u304C\u6B62\u307E\u308A\u307E\u3057\u305F\u3002" },
        /** Transfer Trail, the open row of gratitude sent to you: the fine print when your watching it couldn't be saved */
        notMarkedSeen: {
          en: "Couldn\u2019t mark this gratitude watched: {{reason}}",
          ja: "\u3053\u306E\u611F\u8B1D\u3092\u898B\u305F\u3053\u3068\u3092\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
        }
      },
      /** The Original Artist Gratitude Share, out of the giver's part. Never money words. */
      artistShare: {
        /** Transfer Trail, the open row of a sticker you drew that others passed on: the fine print for your Original Artist Gratitude Share */
        youDrewIt: {
          en: "{{share}} of it came to you, its artist",
          ja: "\u3053\u306E\u3046\u3061{{share}}\u304C\u3001\u4F5C\u8005\u306E\u3042\u306A\u305F\u306B\u5C4A\u304D\u307E\u3057\u305F"
        },
        /** Transfer Trail, the open row of a gift you gave of someone else's sticker: the fine print splitting its gratitude between you and its Original Artist */
        youGaveIt: {
          en: "{{kept}} came to you \xB7 {{share}} to {{artist}}, its artist",
          ja: "{{kept}}\u306F\u3042\u306A\u305F\u306B\u30FB{{share}}\u306F\u4F5C\u8005\u306E{{artist}}\u3055\u3093\u306B"
        },
        /** Transfer Trail, the open row of a gift between others: the fine print splitting its gratitude between the giver and the Original Artist */
        between: {
          en: "{{kept}} to {{giver}} \xB7 {{share}} to {{artist}}, its artist",
          ja: "{{kept}}\u306F{{giver}}\u3055\u3093\u306B\u30FB{{share}}\u306F\u4F5C\u8005\u306E{{artist}}\u3055\u3093\u306B"
        }
      },
      /** Transfer Trail: the fold under the newest row, holding one earlier gift; a tap unfolds it */
      earlierGifts_one: { en: "{{count}} earlier gift" },
      /** Transfer Trail: the fold under the newest row, holding the earlier gifts; a tap unfolds them */
      earlierGifts_other: { en: "{{count}} earlier gifts", ja: "\u305D\u308C\u3088\u308A\u524D\u306E\u30AE\u30D5\u30C8{{count}}\u4EF6" }
    },
    /** Someone else's sticker board, opened from Explore. */
    artistBoard: {
      /** Someone else's sticker board, opened from Explore: LINE's header, and screen readers' name for the board */
      title: { en: "{{name}}\u2019s sticker board", ja: "{{name}}\u3055\u3093\u306E\u30B7\u30FC\u30EB\u30DC\u30FC\u30C9" },
      /** Someone else's sticker board: screen readers' name for the button with their photo and name, which turns the board over to their stat board */
      theirStats: { en: "{{name}}: their stats", ja: "{{name}}\u3055\u3093\u306E\u8A18\u9332" },
      /** Someone else's stat board, Gratitude receipt: in place of its rows when their User Stats fail to load, with the reason */
      statsDidntLoad: {
        en: "Their stats didn\u2019t load: {{reason}}",
        ja: "\u8A18\u9332\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
      },
      /** Someone else's sticker board: read out by screen readers when keyboard focus lands on a sticker */
      focusHint: {
        en: "Enter selects it. Arrow keys go to the other stickers.",
        ja: "Enter\u30AD\u30FC\u3067\u9078\u629E\u3057\u307E\u3059\u3002\u77E2\u5370\u30AD\u30FC\u3067\u307B\u304B\u306E\u30B7\u30FC\u30EB\u306B\u79FB\u52D5\u3057\u307E\u3059\u3002"
      },
      /** Someone else's sticker board: read out by screen readers for the selected sticker, whose toolbar holds View */
      selectedHint: {
        en: "Selected. Tab reaches its toolbar, where you can view it. Escape lets go of it.",
        ja: "\u9078\u629E\u4E2D\u3067\u3059\u3002Tab\u30AD\u30FC\u3067\u30C4\u30FC\u30EB\u30D0\u30FC\u306B\u79FB\u52D5\u3059\u308B\u3068\u3001\u30B7\u30FC\u30EB\u3092\u898B\u308B\u3053\u3068\u304C\u3067\u304D\u307E\u3059\u3002Escape\u30AD\u30FC\u3067\u9078\u629E\u3092\u89E3\u9664\u3057\u307E\u3059\u3002"
      },
      /** Someone else's empty sticker board: the note in the dashed spot */
      blank: {
        en: "{{name}} hasn\u2019t stuck anything up yet.",
        ja: "{{name}}\u3055\u3093\u306F\u307E\u3060\u4F55\u3082\u8CBC\u3063\u3066\u3044\u307E\u305B\u3093\u3002"
      },
      /** Someone else's sticker board, when it fails to load: the alert above Try again */
      didntLoad: {
        en: "Couldn\u2019t load {{name}}\u2019s board: {{reason}}",
        ja: "{{name}}\u3055\u3093\u306E\u30B7\u30FC\u30EB\u30DC\u30FC\u30C9\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
      },
      /** Someone else's sticker board: screen readers' name for the back chip at the top, which returns to Explore */
      backToExplore: { en: "Back to Explore", ja: "\u767A\u898B\u306B\u623B\u308B" },
      /** Someone else's sticker board: the back chip at the top that returns to Explore */
      explore: { en: "Explore", ja: "\u767A\u898B" },
      /** Someone else's sticker board: the Give key in Draw's place, which gives them one of your stickers */
      give: { en: "Give", ja: "\u8D08\u308B" },
      /** Someone else's sticker board, a sticker opened large: the fine print under its number; <duration/> is how long it took to draw, <artist/> its Original Artist */
      drawnIn: { en: "Drawn in <duration/> \xB7 <artist/>", ja: "\u5236\u4F5C\u6642\u9593<duration/>\u30FB<artist/>" },
      /** Someone else's sticker board, a sticker opened large: the Close link under it */
      close: { en: "Close", ja: "\u9589\u3058\u308B" }
    }
  };

  // apps/frontend/src/i18n/strings/stickerCreation.ts
  var stickerCreation = {
    /** Drawing screen: the white sheet you draw on, named for screen readers */
    canvas: { en: "Canvas", ja: "\u30AD\u30E3\u30F3\u30D0\u30B9" },
    /** Readable saved ink whose sheet identity cannot be verified. */
    recovery: {
      /** Drawing recovery sheet: heading for readable ink whose ticket cannot be verified */
      title: { en: "Recover your saved drawing", ja: "\u4FDD\u5B58\u3057\u305F\u7D75\u3092\u53D6\u308A\u51FA\u3059" },
      /** Drawing recovery sheet: explains why the saved ink cannot safely resume */
      explanation: {
        en: "Your drawing is still saved, but we can\u2019t verify which sheet it belongs to. Download a copy before replacing it.",
        ja: "\u7D75\u306F\u4FDD\u5B58\u3055\u308C\u3066\u3044\u307E\u3059\u304C\u3001\u3069\u306E\u30AD\u30E3\u30F3\u30D0\u30B9\u306E\u7D75\u304B\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3002\u6D88\u53BB\u3059\u308B\u524D\u306B\u30B3\u30D4\u30FC\u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u3067\u304D\u307E\u3059\u3002"
      },
      /** Drawing recovery sheet: storage could not return readable ink, so no download is offered */
      unread: {
        en: "We couldn\u2019t read your saved drawing. It may still be on this device. Try again before discarding it.",
        ja: "\u4FDD\u5B58\u3057\u305F\u7D75\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u3053\u306E\u7AEF\u672B\u306B\u6B8B\u3063\u3066\u3044\u308B\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002\u6D88\u53BB\u3059\u308B\u524D\u306B\u3001\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
      },
      /** Drawing recovery sheet: a blocked or aborted storage upgrade keeps saved ink intact and offers Retry. */
      upgradeFailed: {
        en: "Your saved drawing couldn\u2019t be updated. Close other Croquis tabs, then retry or reload Croquis. Your saved copy is unchanged.",
        ja: "\u4FDD\u5B58\u3057\u305F\u7D75\u3092\u66F4\u65B0\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u307B\u304B\u306E\u30AF\u30ED\u30C3\u30AD\u30FC\u306E\u30BF\u30D6\u3092\u9589\u3058\u3066\u3001\u3082\u3046\u4E00\u5EA6\u8A66\u3059\u304B\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u4FDD\u5B58\u3057\u305F\u7D75\u306F\u305D\u306E\u307E\u307E\u6B8B\u3063\u3066\u3044\u307E\u3059\u3002"
      },
      /** Drawing recovery sheet: missing or unreadable metadata keeps drawing locked and offers Retry */
      metadataUnknown: {
        en: "We can\u2019t verify the saved drawing\u2019s ticket. Try reading it again, or explicitly discard it. No old ticket will be reused; a new ticket is spent only when you choose to start drawing.",
        ja: "\u4FDD\u5B58\u3057\u305F\u7D75\u306E\u30C1\u30B1\u30C3\u30C8\u3092\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3002\u3082\u3046\u4E00\u5EA6\u8AAD\u307F\u8FBC\u3080\u304B\u3001\u7D75\u3092\u6D88\u53BB\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u4EE5\u524D\u306E\u30C1\u30B1\u30C3\u30C8\u306F\u518D\u4F7F\u7528\u3057\u307E\u305B\u3093\u3002\u65B0\u3057\u3044\u30C1\u30B1\u30C3\u30C8\u306F\u300C\u304B\u304D\u59CB\u3081\u308B\u300D\u3092\u9078\u3076\u307E\u3067\u4F7F\u3044\u307E\u305B\u3093\u3002"
      },
      /** Drawing recovery sheet: explicit discard when no ticket ownership can be established */
      discardUnknown: { en: "Discard saved drawing", ja: "\u4FDD\u5B58\u3057\u305F\u7D75\u3092\u6D88\u53BB" },
      /** Drawing recovery sheet: explicitly downloads all saved steps and the sheet size */
      download: { en: "Download saved drawing", ja: "\u4FDD\u5B58\u3057\u305F\u7D75\u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9" },
      /** Drawing recovery sheet: persistent download failure with a retry action */
      downloadFailed: {
        en: "The drawing couldn\u2019t be downloaded. Your saved copy is unchanged.",
        ja: "\u7D75\u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u4FDD\u5B58\u3057\u305F\u7D75\u306F\u305D\u306E\u307E\u307E\u6B8B\u3063\u3066\u3044\u307E\u3059\u3002"
      },
      /** Drawing recovery sheet: destructive action that replaces the saved drawing */
      discard: { en: "Discard saved drawing and start blank", ja: "\u4FDD\u5B58\u3057\u305F\u7D75\u3092\u6D88\u53BB\u3057\u3066\u304B\u304D\u76F4\u3059" },
      /** Drawing recovery sheet: explains the irreversible replacement and safe close action */
      discardExplanation: {
        en: "Discarding removes this saved drawing from this device. Closing keeps it saved and leaves drawing locked.",
        ja: "\u6D88\u53BB\u3059\u308B\u3068\u3001\u3053\u306E\u7AEF\u672B\u306B\u4FDD\u5B58\u3057\u305F\u7D75\u306F\u5143\u306B\u623B\u305B\u307E\u305B\u3093\u3002\u9589\u3058\u308B\u3068\u7D75\u306F\u6B8B\u308A\u3001\u304B\u304F\u64CD\u4F5C\u306F\u30ED\u30C3\u30AF\u3055\u308C\u305F\u307E\u307E\u306B\u306A\u308A\u307E\u3059\u3002"
      },
      /** Drawing recovery sheet: waits for the server to confirm a previously sent Seal */
      checkingSeal: {
        en: "Checking whether this drawing was already sealed\u2026",
        ja: "\u3053\u306E\u7D75\u304C\u4ED5\u4E0A\u304C\u3063\u3066\u3044\u308B\u304B\u78BA\u8A8D\u3057\u3066\u3044\u307E\u3059\u2026"
      },
      /** Drawing recovery sheet: persistent unresolved Seal error beside Retry */
      sealUnresolved: {
        en: "We can\u2019t confirm whether this drawing was sealed. Your saved drawing stays here until the check succeeds. Try again.",
        ja: "\u3053\u306E\u7D75\u304C\u4ED5\u4E0A\u304C\u3063\u3066\u3044\u308B\u304B\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3002\u78BA\u8A8D\u3067\u304D\u308B\u307E\u3067\u7D75\u306F\u4FDD\u5B58\u3055\u308C\u305F\u307E\u307E\u3067\u3059\u3002\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
      },
      /** Drawing recovery sheet: successful ticket check cannot identify an older ticket after midnight JST */
      oldTicketUnknown: {
        en: "Today\u2019s tickets don\u2019t tell us whether this drawing was sealed. You can download it, then discard it and abandon its old ticket. The old ticket will not be reused. A new ticket is spent only when you choose to start drawing.",
        ja: "\u4ECA\u65E5\u306E\u30C1\u30B1\u30C3\u30C8\u3067\u306F\u3001\u3053\u306E\u7D75\u304C\u4ED5\u4E0A\u304C\u3063\u3066\u3044\u308B\u304B\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3002\u7D75\u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u3057\u3066\u304B\u3089\u3001\u4FDD\u5B58\u3057\u305F\u7D75\u3068\u4EE5\u524D\u306E\u30C1\u30B1\u30C3\u30C8\u3092\u624B\u653E\u305B\u307E\u3059\u3002\u4EE5\u524D\u306E\u30C1\u30B1\u30C3\u30C8\u306F\u518D\u4F7F\u7528\u3057\u307E\u305B\u3093\u3002\u65B0\u3057\u3044\u30C1\u30B1\u30C3\u30C8\u306F\u300C\u304B\u304D\u59CB\u3081\u308B\u300D\u3092\u9078\u3076\u307E\u3067\u4F7F\u3044\u307E\u305B\u3093\u3002"
      },
      /** Drawing recovery sheet: explicitly discards ink and retires an old ticket whose Seal is unknown */
      abandon: {
        en: "Discard drawing and abandon old ticket",
        ja: "\u7D75\u3092\u6D88\u53BB\u3057\u3066\u4EE5\u524D\u306E\u30C1\u30B1\u30C3\u30C8\u3092\u624B\u653E\u3059"
      },
      /** Drawing screen: reopens recovery after it was closed without discarding */
      reopen: { en: "Review saved drawing", ja: "\u4FDD\u5B58\u3057\u305F\u7D75\u3092\u78BA\u8A8D" }
    },
    /** The timer dot, and the white label under it. */
    timer: {
      /** Drawing screen, top left: the timer dot's name for screen readers before the first stroke starts the clock, and on a begun sheet in Kyoto Seika Practice Mode, whose clock never pauses */
      label: { en: "Timer", ja: "\u30BF\u30A4\u30DE\u30FC" },
      /** Drawing screen, top left: the timer dot's name for screen readers while the clock runs; a tap pauses it */
      pause: { en: "Pause timer", ja: "\u30BF\u30A4\u30DE\u30FC\u3092\u4E00\u6642\u505C\u6B62" },
      /** Drawing screen, top left: the timer dot's name for screen readers after you paused it; a tap resumes it */
      resume: { en: "Resume timer", ja: "\u30BF\u30A4\u30DE\u30FC\u3092\u518D\u958B" },
      /** Drawing screen, top left: the small white tag with a pause icon that hangs off the timer dot whenever the clock is stopped; hidden from screen readers */
      paused: { en: "Paused", ja: "\u4E00\u6642\u505C\u6B62" },
      /** Drawing screen, top left: read out once by screen readers, as a polite announcement, when the clock reaches 30 seconds left and again at 10; {{seconds}} is 30 or 10 */
      warning: { en: "{{seconds}} seconds left", ja: "\u6B8B\u308A{{seconds}}\u79D2" },
      /** Read out with the dot: the time left on its face, and why the clock is stopped. */
      status: {
        /** Drawing screen, top left: read by screen readers after the timer dot's name while the clock runs; {{time}} is minutes:seconds, such as 4:32 */
        running: { en: "{{time}} left", ja: "\u6B8B\u308A{{time}}" },
        /** Drawing screen, top left: read by screen readers after the timer dot's name before the first stroke starts the clock */
        waiting: {
          en: "{{time}} left, starts when you draw",
          ja: "\u6B8B\u308A{{time}}\u3001\u304B\u304D\u59CB\u3081\u308B\u3068\u30B9\u30BF\u30FC\u30C8"
        },
        /** Drawing screen, top left, a sheet in Kyoto Seika Practice Mode: read by screen readers after the timer dot's name while its two subjects wait for Begin, which starts the clock */
        dealt: {
          en: "{{time}} left, starts when you press Begin",
          ja: "\u6B8B\u308A{{time}}\u3001\u306F\u3058\u3081\u3092\u62BC\u3059\u3068\u30B9\u30BF\u30FC\u30C8"
        },
        /** Drawing screen, top left: read by screen readers after the timer dot's name once the clock reaches 0:00, under the time's-up seal sheet */
        timeUp: { en: "Time\u2019s up", ja: "\u30BF\u30A4\u30E0\u30A2\u30C3\u30D7" },
        /** Drawing screen, top left: read by screen readers after the timer dot's name while the clock is stopped by a tap on the timer, by the app going to the background, or by another screen covering the drawing screen */
        paused: { en: "{{time}} left, paused", ja: "\u6B8B\u308A{{time}}\u3001\u4E00\u6642\u505C\u6B62\u4E2D" },
        /** Drawing screen, top left: read by screen readers after the timer dot's name while the color sheet is open, which stops the clock */
        color: {
          en: "{{time}} left, paused while you choose a color",
          ja: "\u6B8B\u308A{{time}}\u3001\u8272\u3092\u9078\u3093\u3067\u3044\u308B\u9593\u306F\u4E00\u6642\u505C\u6B62\u4E2D"
        },
        /** Drawing screen, top left: read by screen readers after the timer dot's name while the Smoothing bar is open, which stops the clock */
        smoothing: {
          en: "{{time}} left, paused while you set smoothing",
          ja: "\u6B8B\u308A{{time}}\u3001\u624B\u3076\u308C\u88DC\u6B63\u3092\u8ABF\u6574\u3057\u3066\u3044\u308B\u9593\u306F\u4E00\u6642\u505C\u6B62\u4E2D"
        },
        /** Drawing screen, top left: read by screen readers after the timer dot's name while the clear bar is open, which stops the clock */
        clear: {
          en: "{{time}} left, paused while you choose whether to clear the layer",
          ja: "\u6B8B\u308A{{time}}\u3001\u30EC\u30A4\u30E4\u30FC\u3092\u6D88\u53BB\u3059\u308B\u304B\u9078\u3093\u3067\u3044\u308B\u9593\u306F\u4E00\u6642\u505C\u6B62\u4E2D"
        },
        /** Drawing screen, top left: read by screen readers after the timer dot's name while the current layer's options bar is open beside its chip, which stops the clock */
        layerOptions: {
          en: "{{time}} left, paused while you choose layer options",
          ja: "\u6B8B\u308A{{time}}\u3001\u30EC\u30A4\u30E4\u30FC\u8A2D\u5B9A\u3092\u9078\u3093\u3067\u3044\u308B\u9593\u306F\u4E00\u6642\u505C\u6B62\u4E2D"
        },
        /** Drawing screen, top left: read by screen readers after the timer dot's name while a finger is on the opacity slider's thumb, which stops the clock */
        opacity: {
          en: "{{time}} left, paused while you set the opacity",
          ja: "\u6B8B\u308A{{time}}\u3001\u4E0D\u900F\u660E\u5EA6\u3092\u8ABF\u6574\u3057\u3066\u3044\u308B\u9593\u306F\u4E00\u6642\u505C\u6B62\u4E2D"
        },
        /** Drawing screen, top left: read by screen readers after the timer dot's name while a layer chip is held up to move it, which stops the clock */
        reorder: {
          en: "{{time}} left, paused while you move a layer",
          ja: "\u6B8B\u308A{{time}}\u3001\u30EC\u30A4\u30E4\u30FC\u3092\u79FB\u52D5\u3057\u3066\u3044\u308B\u9593\u306F\u4E00\u6642\u505C\u6B62\u4E2D"
        },
        /** Drawing screen, top left: read by screen readers after the timer dot's name while a finger is on the size rail, which stops the clock */
        size: {
          en: "{{time}} left, paused while you set the brush size",
          ja: "\u6B8B\u308A{{time}}\u3001\u30D6\u30E9\u30B7\u306E\u30B5\u30A4\u30BA\u3092\u8ABF\u6574\u3057\u3066\u3044\u308B\u9593\u306F\u4E00\u6642\u505C\u6B62\u4E2D"
        }
      },
      /** The label under the dot. */
      note: {
        /** Drawing screen, top left: the white label under the timer for a few seconds when you draw on a paused sheet, also announced; the label never wraps by itself, so the line break is where it wraps */
        tapToKeepDrawing: {
          en: "Tap the timer\nto keep drawing.",
          ja: "\u30BF\u30A4\u30DE\u30FC\u3092\u30BF\u30C3\u30D7\u3059\u308B\u3068\n\u7D9A\u304D\u3092\u304B\u3051\u307E\u3059\u3002"
        },
        /** Drawing screen, top left: the white label under the timer after Start on your first few visits, or when you tap the timer before the first stroke; also announced */
        startsWhenYouDraw: { en: "Starts when you draw", ja: "\u304B\u304D\u59CB\u3081\u308B\u3068\u30B9\u30BF\u30FC\u30C8" },
        /** Drawing screen, top left, a sheet in Kyoto Seika Practice Mode: the white label under the timer while its two subjects wait for Begin, on your first few visits or when you tap the timer; also announced */
        startsWhenYouPressBegin: { en: "Starts when you press Begin", ja: "\u306F\u3058\u3081\u3092\u62BC\u3059\u3068\u30B9\u30BF\u30FC\u30C8" },
        /** Drawing screen, top left, a sheet in Kyoto Seika Practice Mode: the white label under the timer for a few seconds at 10 and at 5 minutes left, as a proctor calls the time; also announced */
        minutesLeft: { en: "{{minutes}} minutes left", ja: "\u6B8B\u308A{{minutes}}\u5206" },
        /** Drawing screen, top left, a sheet in Kyoto Seika Practice Mode once begun: the white label under the timer for a few seconds when it's tapped, since its clock never pauses; also announced */
        clockRuns: {
          en: "The clock runs, as in the real test",
          ja: "\u672C\u756A\u3068\u540C\u3058\u304F\u3001\u6642\u8A08\u306F\u6B62\u307E\u308A\u307E\u305B\u3093"
        },
        /** Drawing screen, top left: the white label under the timer when a reload brings back your drawing in progress, paused, until the clock runs again; also announced */
        pickedUp: { en: "Picked up where you left off", ja: "\u7D9A\u304D\u304B\u3089\u518D\u958B\u3057\u307E\u3057\u305F" },
        /** Drawing screen, top left: the white label under the timer when a reload couldn't bring back your drawing, so a fresh sheet uses the same ticket, until the first stroke; also announced; the label never wraps by itself */
        ticketCarriesOver: {
          en: "Couldn\u2019t pick up your drawing,\nso its ticket carries over",
          ja: "\u7D9A\u304D\u304B\u3089\u518D\u958B\u3067\u304D\u306A\u304B\u3063\u305F\u306E\u3067\u3001\n\u30C1\u30B1\u30C3\u30C8\u306F\u305D\u306E\u307E\u307E\u4F7F\u3048\u307E\u3059"
        },
        /** Drawing screen, top left: the white label under the timer when a reload couldn't bring back your drawing, but its seal had reached the server, so it's on your sticker board and a fresh sheet takes its place, until the first stroke; also announced */
        sealedBeforeReload: {
          en: "Your last sticker was sealed",
          ja: "\u524D\u56DE\u306E\u30B7\u30FC\u30EB\u306F\u4ED5\u4E0A\u304C\u308A\u307E\u3057\u305F"
        },
        /** Drawing screen, top left: the white label under the timer when a reload couldn't bring back your drawing in progress, and it had no ticket to carry over, until the first stroke; also announced */
        lost: {
          en: "Couldn\u2019t pick up where you left off",
          ja: "\u524D\u56DE\u306E\u7D9A\u304D\u304B\u3089\u518D\u958B\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F"
        },
        /** Drawing screen, top left: the white label under the timer, also announced, for as long as this device can't keep your drawing in progress, so a reload or closing the app would lose it; it goes once the drawing is kept again; the label never wraps by itself */
        notKept: {
          en: "This device can\u2019t keep your drawing,\nso seal it before you close the app",
          ja: "\u304B\u304D\u304B\u3051\u306E\u30B7\u30FC\u30EB\u3092\u3053\u306E\u7AEF\u672B\u306B\u6B8B\u305B\u307E\u305B\u3093\u3002\n\u30A2\u30D7\u30EA\u3092\u9589\u3058\u308B\u524D\u306B\u4ED5\u4E0A\u3052\u3066\u304F\u3060\u3055\u3044"
        }
      }
    },
    /** The seal key, and the chip over it. */
    seal: {
      /** Drawing screen, bottom right: the seal key's name for screen readers; the key shows a check mark, and a tap opens the seal sheet */
      label: { en: "Seal", ja: "\u4ED5\u4E0A\u3052" },
      /** Drawing screen, bottom right: the chip beside the seal key, announced, when it's tapped but everything drawn was erased or undone */
      empty: {
        en: "The sheet is empty, so there\u2019s nothing to seal.",
        ja: "\u30AD\u30E3\u30F3\u30D0\u30B9\u304C<wbr/>\u771F\u3063\u767D\u306A\u306E\u3067\u3001<wbr/>\u4ED5\u4E0A\u3052\u308B\u3082\u306E\u304C<wbr/>\u3042\u308A\u307E\u305B\u3093\u3002"
      },
      /** Drawing screen, bottom right: the chip beside the seal key, announced, when time runs out after everything drawn was erased or undone; the sheet is fresh again and the chip goes with its first stroke */
      emptyAtTimeUp: {
        en: "Time\u2019s up. The sheet was empty, so nothing was sealed.",
        ja: "\u30BF\u30A4\u30E0\u30A2\u30C3\u30D7\u3067\u3059\u3002<wbr/>\u30AD\u30E3\u30F3\u30D0\u30B9\u304C<wbr/>\u771F\u3063\u767D\u3060\u3063\u305F\u306E\u3067\u3001<wbr/>\u4F55\u3082<wbr/>\u4ED5\u4E0A\u304C\u308A<wbr/>\u307E\u305B\u3093\u3067\u3057\u305F\u3002"
      },
      /** The chip beside the seal key when a seal failed: what failed, then what to do. Its technical detail goes to the console. */
      failed: {
        /** Drawing screen, bottom right: the chip beside the seal key, announced, when sealing failed on this device before the server was asked; the check is the seal key's icon */
        onThisDevice: {
          en: "Couldn\u2019t seal: something went wrong on this device. Tap the check to try again.",
          ja: "\u4ED5\u4E0A\u3052\u3089\u308C<wbr/>\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A<wbr/>\u3053\u306E\u7AEF\u672B\u3067<wbr/>\u554F\u984C\u304C<wbr/>\u8D77\u304D\u307E\u3057\u305F\u3002<wbr/>\u30C1\u30A7\u30C3\u30AF\u3092<wbr/>\u3082\u3046\u4E00\u5EA6<wbr/>\u30BF\u30C3\u30D7\u3057\u3066<wbr/>\u304F\u3060\u3055\u3044\u3002"
        },
        /** Drawing screen, bottom right: the chip beside the seal key, announced, when the app's server didn't answer the seal, or its answer couldn't be read; tapping the check sends the same seal again */
        noAnswer: {
          en: "Couldn\u2019t seal: Croquis didn\u2019t answer. Tap the check to try again.",
          ja: "\u4ED5\u4E0A\u3052\u3089\u308C<wbr/>\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A<wbr/>\u30AF\u30ED\u30C3\u30AD\u30FC\u304B\u3089<wbr/>\u5FDC\u7B54\u304C<wbr/>\u3042\u308A\u307E\u305B\u3093\u3002<wbr/>\u30C1\u30A7\u30C3\u30AF\u3092<wbr/>\u3082\u3046\u4E00\u5EA6<wbr/>\u30BF\u30C3\u30D7\u3057\u3066<wbr/>\u304F\u3060\u3055\u3044\u3002"
        },
        /** Drawing screen, bottom right: the chip beside the seal key, announced, when the app's server failed while sealing */
        serverProblem: {
          en: "Couldn\u2019t seal: something went wrong on our side. Tap the check to try again.",
          ja: "\u4ED5\u4E0A\u3052\u3089\u308C<wbr/>\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A<wbr/>\u3053\u3061\u3089\u5074\u3067<wbr/>\u554F\u984C\u304C<wbr/>\u767A\u751F\u3057\u307E\u3057\u305F\u3002<wbr/>\u30C1\u30A7\u30C3\u30AF\u3092<wbr/>\u3082\u3046\u4E00\u5EA6<wbr/>\u30BF\u30C3\u30D7\u3057\u3066<wbr/>\u304F\u3060\u3055\u3044\u3002"
        },
        /** Drawing screen, bottom right: the chip beside the seal key, announced, when the sticker was saved but its on-chain seal wasn't confirmed; trying again doesn't use another ticket */
        notOnChain: {
          en: "Your sticker is saved, but isn\u2019t sealed on-chain yet. Tap the check to try again.",
          ja: "\u30B7\u30FC\u30EB\u306F<wbr/>\u4FDD\u5B58\u3055\u308C\u307E\u3057\u305F\u304C\u3001<wbr/>\u30D6\u30ED\u30C3\u30AF\u30C1\u30A7\u30FC\u30F3<wbr/>\u4E0A\u3067\u306F<wbr/>\u307E\u3060<wbr/>\u4ED5\u4E0A\u304C\u3063\u3066<wbr/>\u3044\u307E\u305B\u3093\u3002<wbr/>\u30C1\u30A7\u30C3\u30AF\u3092<wbr/>\u3082\u3046\u4E00\u5EA6<wbr/>\u30BF\u30C3\u30D7\u3057\u3066<wbr/>\u304F\u3060\u3055\u3044\u3002"
        },
        /** Drawing screen, bottom right: the chip beside the seal key, announced, when sealing waited on your Sui address (the Privy wallet your stickers are kept in) and it never got ready */
        suiAddress: {
          en: "Couldn\u2019t seal: your Sui address isn\u2019t ready. Tap the check to try again.",
          ja: "\u4ED5\u4E0A\u3052\u3089\u308C<wbr/>\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A<wbr/>Sui\u30A2\u30C9\u30EC\u30B9\u306E<wbr/>\u6E96\u5099\u304C<wbr/>\u3067\u304D\u3066\u3044\u307E\u305B\u3093\u3002<wbr/>\u30C1\u30A7\u30C3\u30AF\u3092<wbr/>\u3082\u3046\u4E00\u5EA6<wbr/>\u30BF\u30C3\u30D7\u3057\u3066<wbr/>\u304F\u3060\u3055\u3044\u3002"
        },
        /** Drawing screen, bottom right: the chip beside the seal key, announced, when sealing waited on your Sui address and LINE's sign-in had expired, so Privy couldn't sign in; tapping the check reconnects with LINE and comes back to the drawing screen, which picks the drawing back up */
        signInExpired: {
          en: "Couldn\u2019t seal: your LINE sign-in expired. Tap the check to reconnect with LINE.",
          ja: "\u4ED5\u4E0A\u3052\u3089\u308C<wbr/>\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A<wbr/>LINE\u306E<wbr/>\u30ED\u30B0\u30A4\u30F3\u60C5\u5831\u306E<wbr/>\u6709\u52B9\u671F\u9650\u304C<wbr/>\u5207\u308C\u307E\u3057\u305F\u3002<wbr/>\u30C1\u30A7\u30C3\u30AF\u3092<wbr/>\u30BF\u30C3\u30D7\u3057\u3066<wbr/>LINE\u3067<wbr/>\u518D\u30ED\u30B0\u30A4\u30F3<wbr/>\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        }
      },
      /** Drawing screen, bottom right: the chip beside the seal key, announced, when the server refused the seal, or LINE couldn't reconnect; {{reason}} is that error's message, which says what to do */
      refused: {
        en: "Couldn\u2019t seal. {{reason}}",
        ja: "\u4ED5\u4E0A\u3052\u3089\u308C<wbr/>\u307E\u305B\u3093\u3067\u3057\u305F\u3002<wbr/>{{reason}}"
      },
      /** Drawing screen, bottom right: the chip beside the seal key, announced, when a seal failed at 0:00, in front of that chip's words; {{problem}} is the words */
      timeUp: { en: "Time\u2019s up. {{problem}}", ja: "\u30BF\u30A4\u30E0\u30A2\u30C3\u30D7\u3067\u3059\u3002<wbr/>{{problem}}" },
      /** Drawing screen, bottom left, at 0:00 after a seal that never reached the server failed: the quiet link that lets the sticker in progress go, and its ticket with it, for a fresh sheet */
      startOver: { en: "Start a new sticker", ja: "\u65B0\u3057\u3044<wbr/>\u30B7\u30FC\u30EB\u3092\u304B\u304F" },
      /** Drawing screen, bottom right: the chip beside the seal key, announced, when the server refused the seal at 0:00; the sheet is fresh again and the chip goes with its first stroke; {{reason}} is the refusal's message */
      refusedAtTimeUp: {
        en: "Time\u2019s up. Croquis didn\u2019t accept the seal, so nothing was sealed. {{reason}}",
        ja: "\u30BF\u30A4\u30E0\u30A2\u30C3\u30D7\u3067\u3059\u3002<wbr/>\u30AF\u30ED\u30C3\u30AD\u30FC\u304C<wbr/>\u4ED5\u4E0A\u3052\u3092<wbr/>\u53D7\u3051\u4ED8\u3051<wbr/>\u306A\u304B\u3063\u305F\u306E\u3067\u3001<wbr/>\u4F55\u3082<wbr/>\u4ED5\u4E0A\u304C\u308A<wbr/>\u307E\u305B\u3093\u3067\u3057\u305F\u3002<wbr/>{{reason}}"
      },
      /** Drawing screen, bottom right: the chip beside the seal key, announced, when a reload brings back a drawing whose seal was on its way, so the sheet stays as it was sealed; tapping the check finishes the seal */
      interrupted: {
        en: "Your sticker was being sealed. Tap the check to finish sealing it.",
        ja: "\u30B7\u30FC\u30EB\u3092<wbr/>\u4ED5\u4E0A\u3052\u3066\u3044\u308B<wbr/>\u9014\u4E2D\u3067\u3057\u305F\u3002<wbr/>\u30C1\u30A7\u30C3\u30AF\u3092<wbr/>\u30BF\u30C3\u30D7\u3057\u3066<wbr/>\u4ED5\u4E0A\u3052\u3066\u304F\u3060\u3055\u3044\u3002"
      }
    },
    /** The bottom sheet the seal key opens over the drawing, and that 0:00 raises. */
    sealSheet: {
      /** Seal sheet, while the visible drawing is being prepared for inspection */
      preparing: { en: "Preparing preview\u2026", ja: "\u30D7\u30EC\u30D3\u30E5\u30FC\u3092\u6E96\u5099\u3057\u3066\u3044\u307E\u3059\u2026" },
      /** Seal sheet, when the visible Layers contain no ink that can become a sticker */
      empty: {
        en: "There\u2019s no visible ink to seal.",
        ja: "\u8868\u793A\u3055\u308C\u3066\u3044\u308B\u63CF\u753B\u304C\u306A\u3044\u305F\u3081\u3001\u4ED5\u4E0A\u3052\u3089\u308C\u307E\u305B\u3093\u3002"
      },
      /** Seal sheet, below the empty preview message before the clock reaches zero */
      emptyHelp: {
        en: "Go back to draw, or check layer opacity and clipping. If Lock is on, turn it off to draw outside existing ink.",
        ja: "\u304B\u304F\u753B\u9762\u306B\u623B\u308B\u304B\u3001\u30EC\u30A4\u30E4\u30FC\u306E\u4E0D\u900F\u660E\u5EA6\u3068\u30AF\u30EA\u30C3\u30D4\u30F3\u30B0\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u900F\u660E\u30D4\u30AF\u30BB\u30EB\u306E\u30ED\u30C3\u30AF\u304C\u30AA\u30F3\u306A\u3089\u3001\u89E3\u9664\u3059\u308B\u3068\u63CF\u753B\u306E\u5916\u306B\u3082\u304B\u3051\u307E\u3059\u3002"
      },
      /** Seal sheet, below an empty or failed preview at zero, before the explicit new sticker action */
      discardHelp: {
        en: "Starting a new sticker discards this drawing.",
        ja: "\u65B0\u3057\u3044\u30B7\u30FC\u30EB\u3092\u304B\u304F\u3068\u3001\u4ECA\u306E\u7D75\u306F\u7834\u68C4\u3055\u308C\u307E\u3059\u3002"
      },
      /** Seal sheet, when the visible drawing cannot be inspected; retry leaves the drawing intact */
      previewFailed: {
        en: "Couldn\u2019t prepare the preview. Your drawing is still here. Try again.",
        ja: "\u30D7\u30EC\u30D3\u30E5\u30FC\u3092\u6E96\u5099\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u4ECA\u306E\u7D75\u306F\u305D\u306E\u307E\u307E\u3067\u3059\u3002\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
      },
      /** Seal sheet, action to retry preparing a failed preview */
      retryPreview: { en: "Try again", ja: "\u3082\u3046\u4E00\u5EA6\u8A66\u3059" },
      /** Seal sheet, heading before the clock reaches zero when the visible layers cannot become a sticker */
      emptyTitle: { en: "No visible ink", ja: "\u8868\u793A\u4E2D\u306E\u63CF\u753B\u304C\u3042\u308A\u307E\u305B\u3093" },
      /** Seal sheet, heading before the clock reaches zero when the preview could not be prepared */
      failedTitle: { en: "Preview unavailable", ja: "\u30D7\u30EC\u30D3\u30E5\u30FC\u3092\u6E96\u5099\u3067\u304D\u307E\u305B\u3093" },
      /** Seal sheet, over the drawing after a tap on the seal key: its title, and its name for screen readers */
      title: { en: "Seal this sticker?", ja: "\u3053\u306E\u30B7\u30FC\u30EB\u3092<wbr/>\u4ED5\u4E0A\u3052\u307E\u3059\u304B\uFF1F" },
      /** Seal sheet, raised by the clock reaching 0:00 (or brought back by a reload then): its title, and its name for screen readers, also announced when it turns in place; the drawing can only be sealed now */
      timeUp: { en: "Time\u2019s up", ja: "\u30BF\u30A4\u30E0\u30A2\u30C3\u30D7" },
      /** Seal sheet, a sheet in Kyoto Seika Practice Mode at 0:00: its title in hand lettering, the proctor's call that ends the test as はじめ began it, and its name for screen readers, also announced when it turns in place */
      pencilsDown: { en: "Pencils down", ja: "\u3084\u3081" },
      /** Seal sheet: the switch row's only words, the sticker detail's own; on, the sticker seals as 18+, and the preview's edge turns pink foil; off on every new sheet */
      nsfw: { en: "Mark 18+", ja: "18+\u306B\u3059\u308B" },
      /** Seal sheet: the 18+ switch's name for screen readers, which starts with its visible words */
      nsfwLabel: {
        en: "Mark 18+: blurred for anyone who hasn\u2019t turned on Show 18+ stickers",
        ja: "18+\u306B\u3059\u308B\uFF1A\u300C18+\u306E\u30B7\u30FC\u30EB\u3092\u8868\u793A\u3059\u308B\u300D\u3092\u30AA\u30F3\u306B\u3057\u3066\u3044\u306A\u3044\u4EBA\u306B\u306F\u307C\u304B\u3057\u3066\u8868\u793A"
      },
      /** Seal sheet: the key, with a check mark, that seals the sticker and starts the seal ceremony */
      seal: { en: "Seal", ja: "\u4ED5\u4E0A\u3052" },
      /** Seal sheet: the quiet link under Seal that closes the sheet back to the drawing; not offered once time's up */
      notYet: { en: "Not yet", ja: "\u3082\u3046\u5C11\u3057\u304B\u304F" },
      /** Seal sheet, primary action when an early preview has no visible ink; returns to the drawing */
      backToDrawing: { en: "Back to drawing", ja: "\u304B\u304F\u753B\u9762\u306B\u623B\u308B" }
    },
    /** The tool strip's tiles, named for assistive tech. */
    tools: {
      /** Drawing screen, top right: the tool strip's name for screen readers */
      label: { en: "Tools", ja: "\u30C4\u30FC\u30EB" },
      /** Drawing screen, top right: the brush tile in the tool strip, named for screen readers */
      brush: { en: "Brush", ja: "\u30D6\u30E9\u30B7" },
      /** Drawing screen, top right: the eraser tile in the tool strip, named for screen readers */
      eraser: { en: "Eraser", ja: "\u6D88\u3057\u30B4\u30E0" },
      /** Drawing screen, top right: the paint bucket tile in the tool strip, named for screen readers */
      fill: { en: "Fill", ja: "\u5857\u308A\u3064\u3076\u3057" },
      /** Drawing screen, top right: the color tile in the tool strip, which opens the color sheet, named for screen readers */
      color: { en: "Color", ja: "\u30AB\u30E9\u30FC" },
      /** Drawing screen, top right: the Smoothing tile's name for screen readers, the title of the Smoothing bar it opens, and that bar's slider's name */
      smoothing: { en: "Smoothing", ja: "\u624B\u3076\u308C\u88DC\u6B63" },
      /** Drawing screen, top right: the clear tile at the end of the tool strip, which opens the clear bar for the current layer, named for screen readers; dimmed while that layer is empty */
      clear: { en: "Clear the layer", ja: "\u30EC\u30A4\u30E4\u30FC\u3092\u6D88\u53BB" },
      /** Drawing screen, tool strip: the Pencil only tile at its start, shown once a pen has drawn on this device, named for screen readers; pressed, only the pen draws on this sheet and fingers tap to undo and redo */
      pencilOnly: { en: "Pencil only", ja: "\u30DA\u30F3\u306E\u307F" }
    },
    fillReference: {
      /** Drawing screen, below the tool strip while Fill is selected: the reference choices' group name */
      label: { en: "Fill reference", ja: "\u5857\u308A\u3064\u3076\u3057\u306E\u53C2\u7167" },
      /** Drawing screen, Fill reference: Fill samples only the selected layer's own pixels */
      layer: { en: "This layer", ja: "\u3053\u306E\u30EC\u30A4\u30E4\u30FC" },
      /** Drawing screen, Fill reference: Fill samples the visible composite of all layers */
      visible: { en: "Visible layers", ja: "\u8868\u793A\u4E2D\u306E\u30EC\u30A4\u30E4\u30FC" },
      /** Drawing screen, Fill reference: the visible source supplies boundaries, while paint goes only on the current layer */
      visibleHelp: {
        en: "Visible ink sets the boundary. Paint stays on this layer.",
        ja: "\u8868\u793A\u4E2D\u306E\u30A4\u30F3\u30AF\u3092\u5883\u754C\u306B\u3057\u307E\u3059\u3002\u5857\u308B\u306E\u306F\u3053\u306E\u30EC\u30A4\u30E4\u30FC\u3060\u3051\u3067\u3059\u3002"
      }
    },
    colorSheet: {
      /** Color sheet, which slides up over the drawing screen from the color tile, or opens under the tool strip on a large screen: its heading, and its name for screen readers */
      title: { en: "Color", ja: "\u30AB\u30E9\u30FC" },
      /** Color sheet: the small label to the left of the row of recently used colors, 50px wide; hidden from screen readers */
      recent: { en: "Recent", ja: "\u6700\u8FD1" },
      /** Color sheet: the row of recently used colors, named for screen readers */
      recentColors: { en: "Recent colors", ja: "\u6700\u8FD1\u4F7F\u3063\u305F\u8272" },
      /** Color sheet: the grid of preset colors, named for screen readers */
      swatches: { en: "Swatches", ja: "\u30D1\u30EC\u30C3\u30C8" },
      /** Color sheet: the hue and saturation pad, named for screen readers */
      huePad: { en: "Hue and saturation", ja: "\u8272\u76F8\u3068\u5F69\u5EA6" },
      /** Color sheet: read by screen readers as the hue and saturation pad moves; {{hue}} is 0 to 359 and {{saturation}} 0 to 100 */
      huePadValue: {
        en: "Hue {{hue}} degrees, saturation {{saturation}}%",
        ja: "\u8272\u76F8{{hue}}\u5EA6\u3001\u5F69\u5EA6{{saturation}}%"
      },
      /** Color sheet: the brightness bar under the pad, named for screen readers */
      brightness: { en: "Brightness", ja: "\u660E\u308B\u3055" },
      /** Each swatch's name, for assistive tech. A color mixed on the pad goes by its hex. */
      swatchNames: {
        /** Color sheet: screen readers' name for the Ink preset color, #1C1824, a violet near-black */
        ink: { en: "Ink", ja: "\u58A8\u8272" },
        /** Color sheet: screen readers' name for the Charcoal preset color, #4A4453, a dark gray */
        charcoal: { en: "Charcoal", ja: "\u30C1\u30E3\u30B3\u30FC\u30EB" },
        /** Color sheet: screen readers' name for the Graphite preset color, #6E6878, a mid gray */
        graphite: { en: "Graphite", ja: "\u30B0\u30E9\u30D5\u30A1\u30A4\u30C8" },
        /** Color sheet: screen readers' name for the Stone preset color, #A39E93, a warm light gray */
        stone: { en: "Stone", ja: "\u30B9\u30C8\u30FC\u30F3" },
        /** Color sheet: screen readers' name for the Sand preset color, #D9D4CB, a pale gray beige */
        sand: { en: "Sand", ja: "\u7802\u8272" },
        /** Color sheet: screen readers' name for the White preset color, #FFFFFF */
        white: { en: "White", ja: "\u767D" },
        /** Color sheet: screen readers' name for the Cream preset color, #FFF1D6 */
        cream: { en: "Cream", ja: "\u30AF\u30EA\u30FC\u30E0" },
        /** Color sheet: screen readers' name for the Peach preset color, #FFE0C7, a pale skin tone */
        peach: { en: "Peach", ja: "\u30D4\u30FC\u30C1" },
        /** Color sheet: screen readers' name for the Tan preset color, #E8B48C, a tanned skin tone */
        tan: { en: "Tan", ja: "\u5C0F\u9EA6\u8272" },
        /** Color sheet: screen readers' name for the Brown preset color, #9A6444 */
        brown: { en: "Brown", ja: "\u8336\u8272" },
        /** Color sheet: screen readers' name for the Yellow preset color, #FFD93B */
        yellow: { en: "Yellow", ja: "\u9EC4\u8272" },
        /** Color sheet: screen readers' name for the Amber preset color, #FFB547, a golden orange */
        amber: { en: "Amber", ja: "\u7425\u73C0\u8272" },
        /** Color sheet: screen readers' name for the Apricot preset color, #F7A541 */
        apricot: { en: "Apricot", ja: "\u30A2\u30D7\u30EA\u30B3\u30C3\u30C8" },
        /** Color sheet: screen readers' name for the Orange preset color, #FF7A45 */
        orange: { en: "Orange", ja: "\u30AA\u30EC\u30F3\u30B8" },
        /** Color sheet: screen readers' name for the Tomato preset color, #FF5A36, a red orange */
        tomato: { en: "Tomato", ja: "\u6731\u8272" },
        /** Color sheet: screen readers' name for the Red preset color, #E8484F */
        red: { en: "Red", ja: "\u8D64" },
        /** Color sheet: screen readers' name for the Brick preset color, #B8472E */
        brick: { en: "Brick", ja: "\u30EC\u30F3\u30AC\u8272" },
        /** Color sheet: screen readers' name for the Chestnut preset color, #7A4A2E */
        chestnut: { en: "Chestnut", ja: "\u6817\u8272" },
        /** Color sheet: screen readers' name for the Caramel preset color, #C58A4A */
        caramel: { en: "Caramel", ja: "\u30AD\u30E3\u30E9\u30E1\u30EB" },
        /** Color sheet: screen readers' name for the Cocoa preset color, #4A2F25, a dark brown */
        cocoa: { en: "Cocoa", ja: "\u30B3\u30B3\u30A2" },
        /** Color sheet: screen readers' name for the Blush preset color, #FFB8C9, a soft pink */
        blush: { en: "Blush", ja: "\u685C\u8272" },
        /** Color sheet: screen readers' name for the Salmon preset color, #FF9E9E */
        salmon: { en: "Salmon", ja: "\u30B5\u30FC\u30E2\u30F3\u30D4\u30F3\u30AF" },
        /** Color sheet: screen readers' name for the Pink preset color, #FF4F9A, a hot pink */
        pink: { en: "Pink", ja: "\u30D4\u30F3\u30AF" },
        /** Color sheet: screen readers' name for the Lilac preset color, #CDBEFF, a pale purple */
        lilac: { en: "Lilac", ja: "\u85E4\u8272" },
        /** Color sheet: screen readers' name for the Grape preset color, #9B7BFF, a violet */
        grape: { en: "Grape", ja: "\u7D2B" },
        /** Color sheet: screen readers' name for the Navy preset color, #3B3F8F, a deep indigo */
        navy: { en: "Navy", ja: "\u7D3A\u8272" },
        /** Color sheet: screen readers' name for the Blue preset color, #2F6BFF */
        blue: { en: "Blue", ja: "\u9752" },
        /** Color sheet: screen readers' name for the Sky preset color, #7CC6FF, a light blue */
        sky: { en: "Sky", ja: "\u7A7A\u8272" },
        /** Color sheet: screen readers' name for the Aqua preset color, #38D3DC, a turquoise */
        aqua: { en: "Aqua", ja: "\u30A2\u30AF\u30A2" },
        /** Color sheet: screen readers' name for the Ice preset color, #BDEFF2, a pale aqua */
        ice: { en: "Ice", ja: "\u6C34\u8272" },
        /** Color sheet: screen readers' name for the Pumpkin preset color, #D96A00, a deep orange */
        pumpkin: { en: "Pumpkin", ja: "\u304B\u307C\u3061\u3083\u8272" },
        /** Color sheet: screen readers' name for the Ochre preset color, #B07F00, a dark mustard yellow */
        ochre: { en: "Ochre", ja: "\u9EC4\u571F\u8272" },
        /** Color sheet: screen readers' name for the Leaf preset color, #4E9A1C, a yellow green */
        leaf: { en: "Leaf", ja: "\u9EC4\u7DD1" },
        /** Color sheet: screen readers' name for the Green preset color, #0E9A6E, an emerald green */
        green: { en: "Green", ja: "\u7DD1" },
        /** Color sheet: screen readers' name for the Forest preset color, #1B6E47, a dark green */
        forest: { en: "Forest", ja: "\u6DF1\u7DD1" },
        /** Color sheet: screen readers' name for the Teal preset color, #00868B, a blue green */
        teal: { en: "Teal", ja: "\u9752\u7DD1" },
        /** Color sheet: screen readers' name for the Cerulean preset color, #1478C8, a mid blue */
        cerulean: { en: "Cerulean", ja: "\u30BB\u30EB\u30EA\u30A2\u30F3\u30D6\u30EB\u30FC" },
        /** Color sheet: screen readers' name for the Violet preset color, #6C3AC4, a deep purple */
        violet: { en: "Violet", ja: "\u3059\u307F\u308C\u8272" },
        /** Color sheet: screen readers' name for the Magenta preset color, #B4299A, a purple pink */
        magenta: { en: "Magenta", ja: "\u30DE\u30BC\u30F3\u30BF" },
        /** Color sheet: screen readers' name for the Plum preset color, #9C2067, a dark berry red */
        plum: { en: "Plum", ja: "\u30D7\u30E9\u30E0" }
      }
    },
    sizeRail: {
      /** Drawing screen, left edge: the size rail's name for screen readers while the brush or the fill is in hand */
      brush: { en: "Brush size", ja: "\u30D6\u30E9\u30B7\u306E\u30B5\u30A4\u30BA" },
      /** Drawing screen, left edge: the size rail's name for screen readers while the eraser is in hand */
      eraser: { en: "Eraser size", ja: "\u6D88\u3057\u30B4\u30E0\u306E\u30B5\u30A4\u30BA" },
      /** Drawing screen, left edge: read by screen readers as the size rail moves; {{size}} is the brush's or eraser's size in px; the number shown on the rail doesn't use this text */
      value: { en: "{{size}} px", ja: "{{size}}\u30D4\u30AF\u30BB\u30EB" }
    },
    /** The thin line beside the layer chips that sets the current layer's opacity. */
    opacitySlider: {
      /** Drawing screen, beside the layer chips: the opacity slider's name for screen readers */
      label: { en: "Opacity", ja: "\u4E0D\u900F\u660E\u5EA6" },
      /** Drawing screen, beside the layer chips: read by screen readers as the opacity slider moves, and shown beside its thumb while a finger is on it; {{value}} is 0 to 100 */
      value: { en: "{{value}}%", ja: "{{value}}%" },
      /** Drawing screen, opacity slider: the persistent label beside its thumb, including while held or keyboard focused */
      readout: { en: "Opacity {{value}}%", ja: "\u4E0D\u900F\u660E\u5EA6{{value}}%" },
      /** Drawing screen, beside the layer chips: the white label that sticks out from the opacity slider for a few seconds when a stroke meets a hidden layer (opacity 0), also announced; the label never wraps by itself, so the line break is where it wraps */
      hiddenHint: {
        en: "Hidden. Raise its\nopacity to draw.",
        ja: "\u975E\u8868\u793A\u4E2D\u3067\u3059\u3002\u4E0D\u900F\u660E\u5EA6\u3092\n\u4E0A\u3052\u308B\u3068\u304B\u3051\u307E\u3059\u3002"
      }
    },
    /** The layer column under the size rail, and the options bar the current chip opens. */
    layers: {
      /** Drawing screen, the layer column under the size rail: the list of layer chips, named for screen readers */
      label: { en: "Layers", ja: "\u30EC\u30A4\u30E4\u30FC" },
      /** Drawing screen, overflowing layer list: the persistent position indicator's accessible name */
      scrollPosition: { en: "Layer list position", ja: "\u30EC\u30A4\u30E4\u30FC\u4E00\u89A7\u306E\u4F4D\u7F6E" },
      /** Drawing screen, overflowing layer list at its top: the position indicator's description */
      moreBelow: { en: "More layers below", ja: "\u4E0B\u306B\u30EC\u30A4\u30E4\u30FC\u304C\u3042\u308A\u307E\u3059" },
      /** Drawing screen, overflowing layer list between its ends: the position indicator's description */
      moreAboveAndBelow: { en: "More layers above and below", ja: "\u4E0A\u4E0B\u306B\u30EC\u30A4\u30E4\u30FC\u304C\u3042\u308A\u307E\u3059" },
      /** Drawing screen, overflowing layer list at its bottom: the position indicator's description */
      moreAbove: { en: "More layers above", ja: "\u4E0A\u306B\u30EC\u30A4\u30E4\u30FC\u304C\u3042\u308A\u307E\u3059" },
      /** Drawing screen, layer column: a chip's name for screen readers, by the number printed on it, which stays the layer's for life */
      chip: { en: "Layer {{number}}", ja: "\u30EC\u30A4\u30E4\u30FC{{number}}" },
      /** Drawing screen, layer column: a chip's name for screen readers with one of its states after it, such as "Layer 2, hidden"; a chip with several states takes each in turn */
      withState: { en: "{{name}}, {{state}}", ja: "{{name}}\u3001{{state}}" },
      /** Drawing screen, layer column: read after a chip's name by screen readers while its layer is at 0% opacity, which hides it and blocks ink on it */
      hidden: { en: "hidden", ja: "\u975E\u8868\u793A" },
      /** Drawing screen, layer column: read after a chip's name by screen readers while its layer locks its transparent pixels */
      locked: { en: "locked", ja: "\u900F\u660E\u30D4\u30AF\u30BB\u30EB\u3092\u30ED\u30C3\u30AF\u4E2D" },
      /** Drawing screen, layer column: read after a chip's name by screen readers while its layer clips to the layer below; {{base}} is the number of the layer it shows through */
      clippedTo: { en: "clipped to layer {{base}}", ja: "\u30EC\u30A4\u30E4\u30FC{{base}}\u3067\u30AF\u30EA\u30C3\u30D4\u30F3\u30B0" },
      /** Drawing screen, layer column: the + tile above the chips, which adds a layer over the current one, named for screen readers; dimmed at ten layers */
      add: { en: "New layer", ja: "\u65B0\u898F\u30EC\u30A4\u30E4\u30FC" },
      /** Drawing screen, beside the disabled new-layer button when the sheet has its maximum layer count */
      maximum: { en: "{{count}} layers \xB7 maximum", ja: "\u30EC\u30A4\u30E4\u30FC\u306F{{count}}\u679A\u307E\u3067" },
      /** Drawing screen, beside a new blank layer until its options have been discovered */
      optionsHint: {
        en: "Tap the selected layer again for options.",
        ja: "\u9078\u629E\u4E2D\u306E\u30EC\u30A4\u30E4\u30FC\u3092\u3082\u3046\u4E00\u5EA6\u30BF\u30C3\u30D7\u3059\u308B\u3068\u3001\u8A2D\u5B9A\u304C\u958B\u304D\u307E\u3059\u3002"
      },
      /** Drawing screen, the close button on the first-use layer-options hint */
      dismissOptionsHint: { en: "Dismiss layer hint", ja: "\u30EC\u30A4\u30E4\u30FC\u306E\u30D2\u30F3\u30C8\u3092\u9589\u3058\u308B" },
      /** Drawing screen, layer options bar, opened by tapping the current chip: its name for screen readers; {{number}} is the layer's */
      options: { en: "Layer {{number}} options", ja: "\u30EC\u30A4\u30E4\u30FC{{number}}\u306E\u8A2D\u5B9A" },
      /** Layer options bar: the toggle tile that keeps the brush and the fill to pixels already on the layer, named for screen readers */
      lock: { en: "Lock transparent pixels", ja: "\u900F\u660E\u30D4\u30AF\u30BB\u30EB\u3092\u30ED\u30C3\u30AF" },
      /** Layer options bar: the effect of locking transparent pixels, below its toggle name */
      lockHelp: {
        en: "Keeps new marks inside this layer\u2019s ink.",
        ja: "\u3053\u306E\u30EC\u30A4\u30E4\u30FC\u306E\u63CF\u753B\u5185\u3060\u3051\u306B\u304B\u3051\u307E\u3059\u3002"
      },
      /** Layer options bar: the effect of active transparent-pixel Lock and how to draw outside existing ink */
      lockedHelp: {
        en: "Keeps new marks inside this layer\u2019s ink. Turn off to draw outside it.",
        ja: "\u3053\u306E\u30EC\u30A4\u30E4\u30FC\u306E\u63CF\u753B\u5185\u3060\u3051\u306B\u304B\u3051\u307E\u3059\u3002\u5916\u306B\u3082\u304B\u304F\u306B\u306F\u3001\u30ED\u30C3\u30AF\u3092\u89E3\u9664\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
      },
      /** Layer options bar: the toggle tile that shows the layer only where the layer below has ink, named for screen readers; dimmed on the bottom layer */
      clip: { en: "Clip to layer below", ja: "\u4E0B\u306E\u30EC\u30A4\u30E4\u30FC\u3067\u30AF\u30EA\u30C3\u30D4\u30F3\u30B0" },
      /** Layer options bar: the effect of clipping, naming the nearest unclipped layer below */
      clipHelp: {
        en: "Shows this layer only inside layer {{base}}\u2019s ink. If no marks show, add ink to layer {{base}} or turn Clip off.",
        ja: "\u30EC\u30A4\u30E4\u30FC{{base}}\u306E\u63CF\u753B\u5185\u3060\u3051\u306B\u8868\u793A\u3057\u307E\u3059\u3002\u4F55\u3082\u8868\u793A\u3055\u308C\u306A\u3044\u3068\u304D\u306F\u3001\u30EC\u30A4\u30E4\u30FC{{base}}\u306B\u304B\u304F\u304B\u3001\u30AF\u30EA\u30C3\u30D4\u30F3\u30B0\u3092\u89E3\u9664\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
      },
      /** Layer options bar: explains why clipping is unavailable on the bottom layer */
      clipUnavailable: { en: "No layer below to clip to.", ja: "\u4E0B\u306B\u30EC\u30A4\u30E4\u30FC\u304C\u3042\u308A\u307E\u305B\u3093\u3002" },
      /** Layer options bar: the tile that moves the layer one place back, under the one below it, named for screen readers; dimmed at the back */
      moveBack: { en: "Move back", ja: "\u80CC\u9762\u3078" },
      /** Layer options bar: the tile that moves the layer one place forward, over the one above it, named for screen readers; dimmed at the front */
      moveForward: { en: "Move forward", ja: "\u524D\u9762\u3078" },
      /** Layer options bar: the tile that deletes the layer at once, which undo brings back, named for screen readers; dimmed on the last layer */
      delete: { en: "Delete layer", ja: "\u30EC\u30A4\u30E4\u30FC\u3092\u524A\u9664" },
      /** Layer options bar: explains how to recover a deleted layer */
      deleteHelp: {
        en: "Undo brings a deleted layer back.",
        ja: "\u524A\u9664\u3057\u305F\u30EC\u30A4\u30E4\u30FC\u306F\u300C\u5143\u306B\u623B\u3059\u300D\u3067\u623B\u305B\u307E\u3059\u3002"
      },
      /** Layer options bar: explains why the sheet's last layer cannot be deleted */
      deleteUnavailable: { en: "Keep at least one layer.", ja: "\u30EC\u30A4\u30E4\u30FC\u306F\u6700\u4F4E1\u679A\u5FC5\u8981\u3067\u3059\u3002" },
      /** Drawing screen, layer column: announced to screen readers when Move back or a drop puts a layer behind another; {{other}} is that layer's number */
      movedBehind: {
        en: "Layer {{number}} moved behind layer {{other}}",
        ja: "\u30EC\u30A4\u30E4\u30FC{{number}}\u3092\u30EC\u30A4\u30E4\u30FC{{other}}\u306E\u80CC\u9762\u3078\u79FB\u52D5\u3057\u307E\u3057\u305F"
      },
      /** Drawing screen, layer column: announced to screen readers when Move forward or a drop puts a layer in front of another; {{other}} is that layer's number */
      movedInFront: {
        en: "Layer {{number}} moved in front of layer {{other}}",
        ja: "\u30EC\u30A4\u30E4\u30FC{{number}}\u3092\u30EC\u30A4\u30E4\u30FC{{other}}\u306E\u524D\u9762\u3078\u79FB\u52D5\u3057\u307E\u3057\u305F"
      },
      /** Drawing screen, the chip over the seal key: announced when a mark or layer change cannot finish because the device lacks canvas memory; it stays until a drawing change succeeds */
      inkFailed: {
        en: "Couldn\u2019t update the drawing: this device is short on memory. Deleting a layer makes room.",
        ja: "\u7AEF\u672B\u306E<wbr/>\u30E1\u30E2\u30EA\u4E0D\u8DB3\u3067<wbr/>\u7D75\u3092<wbr/>\u66F4\u65B0\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002<wbr/>\u30EC\u30A4\u30E4\u30FC\u3092<wbr/>\u524A\u9664\u3059\u308B\u3068<wbr/>\u7A7A\u304D\u304C<wbr/>\u3067\u304D\u307E\u3059\u3002"
      },
      /** Drawing screen, the chip over the seal key: announced when stabilization cannot finish a stroke; it stays until a drawing change succeeds */
      stabilizationFailed: {
        en: "This stroke couldn\u2019t be saved because smoothing failed. Please draw it again.",
        ja: "\u624B\u30D6\u30EC\u88DC\u6B63\u306B<wbr/>\u5931\u6557\u3057\u305F\u305F\u3081\u3001<wbr/>\u3053\u306E\u7DDA\u3092<wbr/>\u4FDD\u5B58\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002<wbr/>\u3082\u3046\u4E00\u5EA6<wbr/>\u63CF\u3044\u3066\u304F\u3060\u3055\u3044\u3002"
      }
    },
    /** The bar under the tools, named like its tile. */
    smoothingBar: {
      /** Smoothing bar, under the tool strip: the small label at the slider's left end, no smoothing; hidden from screen readers */
      raw: { en: "Raw", ja: "\u5F31" },
      /** Smoothing bar, under the tool strip: the small label at the slider's right end, the most smoothing; hidden from screen readers */
      smooth: { en: "Smooth", ja: "\u5F37" }
    },
    /** The bar under the tools that asks before the current layer is cleared. */
    clearBar: {
      /** Clear bar, under the tool strip after a tap on the clear tile: its title, which also names it for screen readers */
      title: { en: "Clear the layer?", ja: "\u30EC\u30A4\u30E4\u30FC\u3092<wbr/>\u6D88\u53BB\u3057\u307E\u3059\u304B\uFF1F" },
      /** Clear bar: the line under the title, also read by screen readers; the timer keeps its time rather than starting over */
      line: {
        en: "Undo brings it back. The timer won\u2019t start over.",
        ja: "\u300C\u5143\u306B\u623B\u3059\u300D\u3067<wbr/>\u623B\u305B\u307E\u3059\u3002<wbr/>\u30BF\u30A4\u30DE\u30FC\u306F<wbr/>\u30EA\u30BB\u30C3\u30C8<wbr/>\u3055\u308C\u307E\u305B\u3093\u3002"
      },
      /** Clear bar: the quiet link that closes it with nothing cleared */
      cancel: { en: "Cancel", ja: "\u30AD\u30E3\u30F3\u30BB\u30EB" },
      /** Clear bar: the red button that clears the current layer; undo brings its ink back */
      clear: { en: "Clear", ja: "\u6D88\u53BB" }
    },
    history: {
      /** Drawing screen, bottom left: the undo tile, named for screen readers */
      undo: { en: "Undo", ja: "\u5143\u306B\u623B\u3059" },
      /** Drawing screen, bottom left: the redo tile, named for screen readers */
      redo: { en: "Redo", ja: "\u3084\u308A\u76F4\u3059" }
    },
    /** Drawing screen, at the foot between redo and the seal check: the tile that opens your sticker board, named for screen readers */
    myBoard: { en: "My board", ja: "\u30DE\u30A4\u30DC\u30FC\u30C9" },
    /** The white label at the foot of the drawing screen while the seal is on its way, which screen readers hear too. */
    sealCeremony: {
      /** Drawing screen, after tapping the check to seal: the white label at the foot of the screen while the server records the seal, and what screen readers hear */
      sealing: { en: "Sealing your sticker\u2026", ja: "\u30B7\u30FC\u30EB\u3092\u4ED5\u4E0A\u3052\u3066\u3044\u307E\u3059\u2026" },
      /** Drawing screen, when sealing takes a while: the line added under “Sealing your sticker…” on a fresh label */
      takesAWhile: { en: "It can take up to half a minute.", ja: "30\u79D2\u307B\u3069\u304B\u304B\u308B\u3053\u3068\u304C\u3042\u308A\u307E\u3059\u3002" },
      /** Drawing screen, when sealing takes longer still: the line that replaces “It can take up to half a minute.” */
      takingLonger: { en: "It\u2019s taking longer than usual.", ja: "\u3044\u3064\u3082\u3088\u308A\u6642\u9593\u304C\u304B\u304B\u3063\u3066\u3044\u307E\u3059\u3002" }
    },
    /** The backing card the sticker lands on. */
    sealedCard: {
      /** Sealed card, the backing card the new sticker lands on at the end of the seal ceremony: its title, under the sticker */
      title: { en: "Sealed", ja: "\u4ED5\u4E0A\u304C\u308A\u307E\u3057\u305F" },
      /** Sealed card: the fine print under the title; {{no}} is the sticker's number (No.0012), <duration/> its drawing time (3分12秒) and {{day}} the day it was sealed (2026.09.27) */
      finePrint: { en: "{{no}} \xB7 <duration/> \xB7 {{day}}", ja: "{{no}}\u30FB<duration/>\u30FB{{day}}" },
      /** Sealed card: the main key while you have tickets left; it opens a fresh sheet for the next sticker */
      keepDrawing: { en: "Keep drawing", ja: "\u3082\u30461\u679A\u304B\u304F" },
      /** Sealed card: the small button at the bottom after your last ticket, with a ticket icon; it opens the reserve ticket checkout */
      buyReserveTickets: { en: "Buy reserve tickets", ja: "\u6709\u511F\u30C1\u30B1\u30C3\u30C8\u3092\u8CB7\u3046" },
      /** Sealed card: the line under the tickets once this sticker used the day's last daily ticket, whether or not reserve tickets remain; {{time}} is when daily tickets refill (0:00 in Japanese) */
      refill: {
        en: "New daily tickets at {{time}}",
        ja: "{{time}}\u306B\u65B0\u3057\u3044\u7121\u511F\u30C1\u30B1\u30C3\u30C8\u304C\u5C4A\u304D\u307E\u3059"
      }
    }
  };

  // apps/frontend/src/i18n/strings/stickers.ts
  var stickers = {
    duration: {
      /** A sticker's drawing time in fine print, like 4m 52s: on the sealed card, the Explore feed, a sticker's view on someone else's board, the giving screen and the Mini-game, and in a Gift Message's text */
      minutesAndSeconds: { en: "{{minutes}}m {{seconds}}s", ja: "{{minutes}}\u5206{{seconds}}\u79D2" },
      /** A sticker's drawing time in fine print on the minute, like 5m, wherever the 4m 52s form shows */
      minutes: { en: "{{minutes}}m", ja: "{{minutes}}\u5206" },
      /** A sticker's drawing time in fine print under a minute, like 54s, wherever the 4m 52s form shows */
      seconds: { en: "{{seconds}}s", ja: "{{seconds}}\u79D2" }
    },
    spokenDuration: {
      /** Screen readers only: a drawing time read aloud, the minutes then the seconds, for the fine-print time and a sticker on a board */
      minutesAndSeconds: { en: "{{minutes}} {{seconds}}", ja: "{{minutes}}{{seconds}}" },
      /** Screen readers only: the minutes of a drawing time read aloud, for 1 minute */
      minutes_one: { en: "{{count}} minute" },
      /** Screen readers only: the minutes of a drawing time read aloud */
      minutes_other: { en: "{{count}} minutes", ja: "{{count}}\u5206" },
      /** Screen readers only: the seconds of a drawing time read aloud, for 1 second */
      seconds_one: { en: "{{count}} second" },
      /** Screen readers only: the seconds of a drawing time read aloud */
      seconds_other: { en: "{{count}} seconds", ja: "{{count}}\u79D2" }
    },
    /** Names a sticker's Original Artist: a caption, then their handle. */
    artistChip: {
      /** Artist chip, the Original Artist's picture and name on a sticker someone else drew: its screen-reader label; {{name}} is their @handle or LINE name */
      label: { en: "Artist: {{name}}", ja: "\u4F5C\u8005\uFF1A{{name}}" },
      /** Artist chip: small caption over the Original Artist's name, on a sticker's detail, its toolbar and menu, and over stickers as your board first loads */
      artist: { en: "Artist", ja: "\u4F5C\u8005" },
      /** Artist chip, one-line form for tight rows: before the Original Artist's name, as in By @alice */
      by: { en: "By", ja: "\u4F5C\u8005" }
    },
    /** An NSFW sticker, which only someone with Show 18+ stickers on sees plainly. */
    nsfw: {
      /** Over an NSFW sticker that's blurred because Show 18+ stickers is off, on a sticker board, a sticker's detail, the sticker tray, Explore, and the give sheet's picker: the small mark in its middle. Also the tag after Sealed on the sealed card of a sticker sealed as 18+ */
      mark: { en: "18+", ja: "18+" },
      /** Screen readers only: an NSFW sticker that's blurred because Show 18+ stickers is off, wherever the 18+ mark shows */
      veiled: { en: "Blurred: 18+ sticker", ja: "\u307C\u304B\u3057\u8868\u793A\uFF1A18+\u306E\u30B7\u30FC\u30EB" }
    },
    /** The stickers the give sheet picks from. */
    keptStickers: {
      /** Give sheet: alert when your stickers fail to load; {{reason}} is the error message */
      notLoaded: {
        en: "Couldn\u2019t load your stickers: {{reason}}",
        ja: "\u624B\u6301\u3061\u306E\u30B7\u30FC\u30EB\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
      }
    }
  };

  // apps/frontend/src/i18n/strings/tickets.ts
  var tickets = {
    /** The tickets behind the board's Draw key, the reserve ticket's dot badge on the ticket cards, and the sealed card's reserve ticket: how many of that kind are left */
    count: { en: "\xD7{{count}}", ja: "\xD7{{count}}" },
    /** The tickets the next drawing can use, in words for screen readers: "2 daily tickets left". A kind with none left isn't named. */
    summary: {
      /** Screen-reader name of a Draw key (sticker board, refilled out-of-tickets card, reserve ticket checkout after a purchase) and of the sealed card's ticket row: one kind's count, such as "2 daily tickets", with what's left */
      left: { en: "{{tickets}} left", ja: "{{tickets}}\u304C\u6B8B\u3063\u3066\u3044\u307E\u3059" },
      /** Screen-reader name of a Draw key and of the sealed card's ticket row: both counts, while daily tickets are left and reserve tickets are held */
      dailyAndReserve: {
        en: "{{daily}} and {{reserve}} left",
        ja: "{{daily}}\u3068{{reserve}}\u304C\u6B8B\u3063\u3066\u3044\u307E\u3059"
      },
      /** Screen-reader name of a Draw key: the daily ticket count, when one is left */
      daily_one: { en: "{{count}} daily ticket" },
      /** Screen-reader name of a Draw key: the daily ticket count */
      daily_other: { en: "{{count}} daily tickets", ja: "\u7121\u511F\u30C1\u30B1\u30C3\u30C8{{count}}\u679A" },
      /** Screen-reader name of a Draw key: the reserve ticket count, when one is left */
      reserve_one: { en: "{{count}} reserve ticket" },
      /** Screen-reader name of a Draw key: the reserve ticket count */
      reserve_other: { en: "{{count}} reserve tickets", ja: "\u6709\u511F\u30C1\u30B1\u30C3\u30C8{{count}}\u679A" },
      /** Screen-reader name of the board's Draw key and the sealed card's ticket row with no tickets of either kind; {{time}} is when daily tickets refill, such as "12:00 AM" */
      none: { en: "no tickets until {{time}}", ja: "{{time}}\u307E\u3067\u30C1\u30B1\u30C3\u30C8\u306F\u3042\u308A\u307E\u305B\u3093" }
    },
    /** How long until the refill, in whole minutes rounded down. */
    refillIn: {
      /** Out-of-tickets card: the countdown after the refill time, in the last minute before new daily tickets arrive */
      underAMinute: { en: "in under a minute", ja: "\u307E\u3082\u306A\u304F" },
      /** Out-of-tickets card: the countdown after the refill time, such as "in 6h 56m" */
      hoursAndMinutes: { en: "in {{hours}}h {{minutes}}m", ja: "\u3042\u3068{{hours}}\u6642\u9593{{minutes}}\u5206" },
      /** Out-of-tickets card: the countdown after the refill time, on the hour, such as "in 6h" */
      hours: { en: "in {{hours}}h", ja: "\u3042\u3068{{hours}}\u6642\u9593" },
      /** Out-of-tickets card: the countdown after the refill time, in the last hour, such as "in 42m" */
      minutes: { en: "in {{minutes}}m", ja: "\u3042\u3068{{minutes}}\u5206" }
    },
    /** Sticker board, the empty ticket backing behind the Draw key when no tickets of either kind are left, in small capitals: when new daily tickets arrive; {{time}} is the refill time, such as "12:00 AM" */
    newAt: { en: "New at {{time}}", ja: "{{time}}\u306B\u5C4A\u304F" },
    /** Start card, while daily tickets are left and you hold reserve ones: the small caption after the small reserve ticket and its count, under the daily ticket stubs */
    reserve: { en: "Reserve", ja: "\u6709\u511F" },
    /** The Draw key on the out-of-tickets card once the refill brings tickets back, and in the reserve ticket checkout (card or Shop tab) after a purchase */
    draw: { en: "Draw", ja: "\u304B\u304F" },
    /** Screen-reader name of that Draw key (refilled out-of-tickets card, reserve ticket checkout after a purchase); `tickets` names what's left, such as "2 daily tickets left" */
    drawWithTickets: { en: "Draw: {{tickets}}", ja: "\u304B\u304F\uFF1A{{tickets}}" },
    /** Start card when only reserve tickets are left, and the out-of-tickets card: the button under the key, with a ticket icon, that opens the reserve ticket checkout */
    buyReserveTickets: { en: "Buy reserve tickets", ja: "\u6709\u511F\u30C1\u30B1\u30C3\u30C8\u3092\u8CB7\u3046" },
    /** Quiet link at the foot of the start card, the tickets-didn't-load card and the reserve ticket checkout's card: closes the card without spending or buying */
    notNow: { en: "Not now", ja: "\u3042\u3068\u3067" },
    /** Key on the card when tickets didn't load, and the link after the reserve ticket checkout's balance problem: tries again */
    tryAgain: { en: "Try again", ja: "\u3082\u3046\u4E00\u5EA6" },
    /** The card that asks before a ticket is spent on a fresh sheet. */
    startDrawing: {
      /** While there are daily tickets left. */
      daily: {
        /** Start card on the drawing screen, before a fresh sheet, while daily tickets are left: the title asking to spend one */
        title: { en: "Use a ticket to draw?", ja: "\u30C1\u30B1\u30C3\u30C8\u3092\u4F7F\u3063\u3066\u304B\u304D\u307E\u3059\u304B\uFF1F" },
        /** Start card, daily ticket variant: the bold line under the title, when one daily ticket is left */
        left_one: { en: "You have {{count}} daily ticket left." },
        /** Start card, daily ticket variant: the bold line under the title saying how many daily tickets are left; it has a line of its own */
        left_other: {
          en: "You have {{count}} daily tickets left.",
          ja: "\u7121\u511F\u30C1\u30B1\u30C3\u30C8\u306F<wbr/>\u6B8B\u308A{{count}}\u679A\u3067\u3059\u3002"
        },
        /** Start card, daily ticket variant: the quiet line under the count, about the drawing timer; "3‑minute" is joined by a non-breaking hyphen (U+2011), so it never breaks at the hyphen */
        timer: {
          en: "Your {{minutes}}\u2011minute timer starts with your first stroke.",
          ja: "\u6700\u521D\u306E\u3072\u3068\u7B46\u3067<wbr/>{{minutes}}\u5206\u306E\u30BF\u30A4\u30DE\u30FC\u304C<wbr/>\u59CB\u307E\u308A\u307E\u3059\u3002"
        },
        /** Start card, daily ticket variant: the key that spends a daily ticket and opens the sheet */
        start: { en: "Start drawing", ja: "\u304B\u304D\u59CB\u3081\u308B" }
      },
      /** Once they're used, a reserve ticket is spent only when asked. The large reserve ticket's badge shows the count. */
      reserve: {
        /** Start card on the drawing screen once today's daily tickets are used: the title asking before a reserve ticket is spent */
        title: { en: "Use a reserve ticket?", ja: "\u6709\u511F\u30C1\u30B1\u30C3\u30C8\u3092\u4F7F\u3044\u307E\u3059\u304B\uFF1F" },
        /** Start card, reserve ticket variant: the bold line under the title saying the daily tickets are gone; it has a line of its own, so keep it short */
        used: {
          en: "Today\u2019s daily tickets are used.",
          ja: "\u4ECA\u65E5\u306E\u7121\u511F\u30C1\u30B1\u30C3\u30C8\u306F<wbr/>\u4F7F\u3044\u5207\u308A\u307E\u3057\u305F\u3002"
        },
        /** Start card, reserve ticket variant: the quiet line under "used", saying when new daily tickets arrive (midnight in Tokyo, in the person's own time) */
        refillAt: { en: "New ones at {{time}}.", ja: "{{time}}\u306B<wbr/>\u65B0\u3057\u304F\u5C4A\u304D\u307E\u3059\u3002" },
        /** Start card, reserve ticket variant: read by screen readers only, since the count is on the ticket's badge (one) */
        left_one: { en: "You have {{count}} reserve ticket." },
        /** Start card, reserve ticket variant: read by screen readers only, since the count is on the ticket's badge */
        left_other: {
          en: "You have {{count}} reserve tickets.",
          ja: "\u6709\u511F\u30C1\u30B1\u30C3\u30C8\u306F{{count}}\u679A\u3042\u308A\u307E\u3059\u3002"
        },
        /** Start card, reserve ticket variant: the blue key that spends a reserve ticket and opens the sheet */
        use: { en: "Use a reserve ticket", ja: "\u6709\u511F\u30C1\u30B1\u30C3\u30C8\u3092\u4F7F\u3046" }
      },
      /** When a ticket couldn't be spent on a fresh sheet, the card stops asking and says why; its key tries again. */
      failed: {
        /** Start card on the drawing screen, when a ticket couldn't be spent on a fresh sheet (Draw, Keep drawing or the card's own key): the title, over the reason in Ink */
        title: { en: "Couldn\u2019t start your sticker", ja: "\u30B7\u30FC\u30EB\u3092\u304B\u304D\u59CB\u3081\u3089\u308C\u307E\u305B\u3093\u3067\u3057\u305F" }
      }
    },
    /** Out of daily and reserve tickets, until the refill turns the card over. */
    outOfTickets: {
      /** Out-of-tickets card on the drawing screen, when both daily and reserve tickets are used up: the title */
      title: { en: "Out of tickets for today", ja: "\u4ECA\u65E5\u306F\u3082\u3046<wbr/>\u30C1\u30B1\u30C3\u30C8\u304C<wbr/>\u3042\u308A\u307E\u305B\u3093" },
      /** Out-of-tickets card: the line under the title, when new daily tickets arrive (bold) and the countdown to it (quiet) */
      refillLine: {
        en: "<strong>New daily tickets at {{time}},</strong> <countdown>{{countdown}}</countdown>",
        ja: "<strong>{{time}}\u306B<wbr/>\u65B0\u3057\u3044\u7121\u511F\u30C1\u30B1\u30C3\u30C8\u304C<wbr/>\u5C4A\u304D\u307E\u3059</strong><countdown>\uFF08{{countdown}}\uFF09</countdown>"
      },
      /** Out-of-tickets card: the title once the refill brings tickets back while it's open, as the card turns over */
      refilled: { en: "New tickets are here", ja: "\u65B0\u3057\u3044<wbr/>\u30C1\u30B1\u30C3\u30C8\u304C<wbr/>\u5C4A\u304D\u307E\u3057\u305F" }
    },
    /** In the start card's place until your tickets load. */
    notLoaded: {
      /** Drawing screen, in the start card's place: the title while your tickets load */
      checking: { en: "Checking your tickets\u2026", ja: "\u30C1\u30B1\u30C3\u30C8\u3092\u78BA\u8A8D\u3057\u3066\u3044\u307E\u3059\u2026" },
      /** Drawing screen, in the start card's place: the title when your tickets didn't load, above the reason */
      couldntLoad: { en: "Couldn\u2019t load your tickets", ja: "\u30C1\u30B1\u30C3\u30C8\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F" }
    },
    /** The reserve ticket checkout: the card that sells reserve ticket packs. */
    checkout: {
      /** Reserve ticket checkout, over the Shop or the drawing screen: the title, over the packs (over the Shop, its reserve tickets headline shows just above) */
      title: { en: "Pick a pack", ja: "\u30D1\u30C3\u30AF\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044" },
      /** Reserve ticket checkout: the bold line under the title */
      lead: { en: "Reserve tickets never expire.", ja: "\u6709\u511F\u30C1\u30B1\u30C3\u30C8\u306B\u6709\u52B9\u671F\u9650\u306F\u3042\u308A\u307E\u305B\u3093\u3002" },
      /** Reserve ticket checkout: the small label on the wallet row, beside your balance in yen (the JPYC in your Sui account, never named here) */
      balance: { en: "Balance", ja: "\u6B8B\u9AD8" },
      /** Reserve ticket checkout, beside the JPYC balance: reads the current Sui balance again without starting a purchase */
      refreshBalance: { en: "Refresh balance", ja: "\u6B8B\u9AD8\u3092\u66F4\u65B0" },
      /** Reserve ticket checkout: the wallet row while the balance loads */
      readingBalance: { en: "Reading your balance\u2026", ja: "\u6B8B\u9AD8\u3092\u78BA\u8A8D\u3057\u3066\u3044\u307E\u3059\u2026" },
      /** Reserve ticket checkout: the balance row when the balance couldn't be read; Sui's own words follow as fine print beside Copy */
      balanceProblem: {
        en: "Couldn\u2019t read your balance.",
        ja: "\u6B8B\u9AD8\u3092\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002"
      },
      /** Reserve ticket checkout: in the packs' place while today's prices load */
      gettingPrices: { en: "Getting today\u2019s prices\u2026", ja: "\u4ECA\u65E5\u306E\u4FA1\u683C\u3092\u78BA\u8A8D\u3057\u3066\u3044\u307E\u3059\u2026" },
      /** Reserve ticket checkout: in the packs' place when today's prices couldn't be fetched, before a Try again link */
      pricesProblem: {
        en: "Couldn\u2019t get today\u2019s prices: {{reason}}",
        ja: "\u4ECA\u65E5\u306E\u4FA1\u683C\u3092\u78BA\u8A8D\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A{{reason}}"
      },
      /** Reserve ticket checkout: screen-reader name of the group of pack buttons */
      packs: { en: "Ticket packs", ja: "\u30C1\u30B1\u30C3\u30C8\u30D1\u30C3\u30AF" },
      /** Reserve ticket checkout: a pack button's name, for the one-ticket pack */
      pack_one: { en: "{{count}} ticket" },
      /** Reserve ticket checkout: a pack button's name, such as "3 tickets" */
      pack_other: { en: "{{count}} tickets", ja: "\u30C1\u30B1\u30C3\u30C8{{count}}\u679A" },
      /** Reserve ticket checkout: a discounted pack button's discount, in fine print before its struck-through full price */
      discount: { en: "\u2212{{percent}}%", ja: "{{percent}}%\u30AA\u30D5" },
      /** Reserve ticket checkout: screen-reader text for a discounted pack's struck-through full price */
      was: { en: "was {{price}}", ja: "\u901A\u5E38\u4FA1\u683C{{price}}" },
      /** Reserve ticket checkout: in a pack's price column, in its price's place, while it's your free first pack */
      free: { en: "Free", ja: "\u7121\u6599" },
      /** Reserve ticket checkout: the blue Pay key, in place of “Pay ¥…”, while the picked pack is your free first pack */
      takeFree: { en: "Get it free", ja: "\u7121\u6599\u3067\u3082\u3089\u3046" },
      /** Reserve ticket checkout: the blue Pay key, before a pack's price is known */
      pay: { en: "Pay", ja: "\u652F\u6255\u3046" },
      /** Reserve ticket checkout: the blue Pay key, with the chosen pack's price */
      payPrice: { en: "Pay {{price}}", ja: "{{price}}\u3092\u652F\u6255\u3046" },
      /** Reserve ticket checkout: the pay key while the payment goes through */
      paying: { en: "Paying\u2026", ja: "\u652F\u6255\u3044\u4E2D\u2026" },
      /** When your balance is less than the picked pack's price: Pay stays sunk, and a line under the packs says why and what to do. */
      short: {
        /** Reserve ticket checkout, under the packs, when your balance can't cover the picked pack but covers a smaller one: what's wrong in bold, then what to do */
        pickSmaller: {
          en: "<strong>Not enough balance for this pack.</strong> Pick a smaller one, or add JPYC to your Sui account.",
          ja: "<strong>\u3053\u306E\u30D1\u30C3\u30AF\u306B\u306F\u6B8B\u9AD8\u304C\u8DB3\u308A\u307E\u305B\u3093\u3002</strong>\u5C0F\u3055\u3044\u30D1\u30C3\u30AF\u3092\u9078\u3076\u304B\u3001Sui\u30A2\u30AB\u30A6\u30F3\u30C8\u306BJPYC\u3092\u8FFD\u52A0\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        },
        /** Reserve ticket checkout, under the packs, when your balance can't cover even the smallest pack: what's wrong in bold, then what to do */
        addJpyc: {
          en: "<strong>Not enough balance for this pack.</strong> Add JPYC to your Sui account to buy it.",
          ja: "<strong>\u3053\u306E\u30D1\u30C3\u30AF\u306B\u306F\u6B8B\u9AD8\u304C\u8DB3\u308A\u307E\u305B\u3093\u3002</strong>\u8CFC\u5165\u3059\u308B\u306B\u306F\u3001Sui\u30A2\u30AB\u30A6\u30F3\u30C8\u306BJPYC\u3092\u8FFD\u52A0\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
        }
      },
      /** Reserve ticket checkout, when your balance is less than the picked pack's price: your Sui address, in place under that line. */
      address: {
        /** Reserve ticket checkout, under the not-enough-balance line: the label that opens your Sui address in place; it reads the same whether open or shut */
        show: { en: "Show my Sui address", ja: "Sui\u30A2\u30C9\u30EC\u30B9\u3092\u8868\u793A" },
        /** Reserve ticket checkout, once “Show my Sui address” is open: the line above the address, on where JPYC goes */
        how: {
          en: "To add JPYC, send it to this address on the Sui network.",
          ja: "JPYC\u3092\u8FFD\u52A0\u3059\u308B\u306B\u306F\u3001Sui\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u3067\u3053\u306E\u30A2\u30C9\u30EC\u30B9\u306B\u9001\u3063\u3066\u304F\u3060\u3055\u3044\u3002"
        }
      },
      /** Reserve ticket checkout, after tapping Pay: what the payment in flight waits on, in a line above the Pay key, read aloud as it changes. */
      waiting: {
        /** Reserve ticket checkout, after tapping Pay: while the server starts the purchase, and its payment is built and signed */
        signing: { en: "Signing the payment\u2026", ja: "\u652F\u6255\u3044\u306B\u7F72\u540D\u3057\u3066\u3044\u307E\u3059\u2026" },
        /** Reserve ticket checkout, after tapping Pay: while the server runs the signed payment on Sui and adds its tickets */
        adding: { en: "Adding your tickets\u2026", ja: "\u30C1\u30B1\u30C3\u30C8\u3092\u8FFD\u52A0\u3057\u3066\u3044\u307E\u3059\u2026" }
      },
      /** Reserve ticket checkout after a purchase: the title, when one reserve ticket was added */
      added_one: { en: "{{count}} reserve ticket added" },
      /** Reserve ticket checkout after a purchase: the title saying how many reserve tickets were added */
      added_other: {
        en: "{{count}} reserve tickets added",
        ja: "\u6709\u511F\u30C1\u30B1\u30C3\u30C8\u3092{{count}}\u679A\u8FFD\u52A0\u3057\u307E\u3057\u305F"
      },
      /** Reserve ticket checkout after a purchase: the quiet line under the title with the price paid, in yen */
      paid: { en: "Paid {{price}} in JPYC.", ja: "{{price}}\u3092JPYC\u3067\u652F\u6255\u3044\u307E\u3057\u305F\u3002" },
      /** Reserve ticket checkout after a purchase: the button under Draw that goes back to the packs */
      buyMore: { en: "Buy more tickets", ja: "\u30C1\u30B1\u30C3\u30C8\u3092\u3082\u3063\u3068\u8CB7\u3046" },
      /** Reserve ticket checkout when a payment fails: the title, above the reason */
      paymentFailed: { en: "Payment didn\u2019t go through", ja: "\u652F\u6255\u3044\u304C\u5B8C\u4E86\u3057\u307E\u305B\u3093\u3067\u3057\u305F" },
      /** Reserve ticket checkout, under “Payment didn’t go through”: one bold line per known reason, then the device's own words as fine print beside Copy. No JPYC moved in any of them. */
      paymentFailure: {
        /** Reserve ticket checkout, payment failed: when building and signing the payment took too long, so it was never sent */
        timedOut: {
          en: "Signing the payment took too long, so it wasn\u2019t sent. Nothing was paid.",
          ja: "\u652F\u6255\u3044\u306E\u7F72\u540D\u306B\u6642\u9593\u304C\u304B\u304B\u3063\u305F\u305F\u3081\u3001\u9001\u4FE1\u3055\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u652F\u6255\u3044\u306F\u884C\u308F\u308C\u3066\u3044\u307E\u305B\u3093\u3002"
        },
        /** Reserve ticket checkout, payment failed: for any other reason */
        other: {
          en: "Something went wrong, so nothing was paid. Try again.",
          ja: "\u554F\u984C\u304C\u767A\u751F\u3057\u305F\u305F\u3081\u3001\u652F\u6255\u3044\u306F\u884C\u308F\u308C\u3066\u3044\u307E\u305B\u3093\u3002\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
        }
      },
      /** When the answer to a signed payment never came: its key sends the same payment again, which never pays twice, and the server adds a landed payment's tickets by itself too. */
      notAdded: {
        /** Reserve ticket checkout, after paying, when the answer to the signed payment never came: the title */
        title: { en: "Tickets not added yet", ja: "\u30C1\u30B1\u30C3\u30C8\u304C\u672A\u8FFD\u52A0\u3067\u3059" },
        /** Reserve ticket checkout, tickets not added: the line under the title, in bold, then why in quiet type; `reason` is the server's or the device's words for the lost answer */
        line: {
          en: "<strong>Adding the tickets again won\u2019t charge you twice.</strong> <why>{{reason}}</why>",
          ja: "<strong>\u30C1\u30B1\u30C3\u30C8\u3092\u3082\u3046\u4E00\u5EA6\u8FFD\u52A0\u3057\u3066\u3082\u3001\u4E8C\u91CD\u306B\u8ACB\u6C42\u3055\u308C\u308B\u3053\u3068\u306F\u3042\u308A\u307E\u305B\u3093\u3002</strong><why>{{reason}}</why>"
        },
        /** Reserve ticket checkout, tickets not added: the blue key that sends the same signed payment again */
        add: { en: "Add the tickets", ja: "\u30C1\u30B1\u30C3\u30C8\u3092\u8FFD\u52A0\u3059\u308B" },
        /** Reserve ticket checkout, tickets not added: that key while it asks */
        adding: { en: "Adding\u2026", ja: "\u8FFD\u52A0\u4E2D\u2026" }
      },
      /** Reserve ticket checkout: the key that goes back to the packs when a payment fails, and the quiet link above Not now when its answer never came */
      backToPacks: { en: "Back to the packs", ja: "\u30D1\u30C3\u30AF\u9078\u3073\u306B\u623B\u308B" },
      /** Reserve ticket checkout: the balance row, in the balance's place, when your Sui account can't be used; the signer's own words follow as fine print beside Copy */
      walletBroken: {
        en: "Your Sui account isn\u2019t working.",
        ja: "Sui\u30A2\u30AB\u30A6\u30F3\u30C8\u304C\u4F7F\u3048\u307E\u305B\u3093\u3002"
      },
      /** Reserve ticket checkout: the balance row, in the balance's place, when the sign-in behind your Sui account failed; the sign-in's own words follow as fine print beside Copy */
      walletSignInFailed: {
        en: "Couldn\u2019t sign you in to pay.",
        ja: "\u652F\u6255\u3044\u306E\u305F\u3081\u306E\u30B5\u30A4\u30F3\u30A4\u30F3\u304C\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002"
      },
      /** Reserve ticket checkout on the dev server: the balance row, in the balance's place, when LIFF Mock signed you in, so there's no Sui account to pay from */
      walletNeedsLine: {
        en: "Paying needs LINE\u2019s sign-in, which LIFF Mock skips.",
        ja: "\u652F\u6255\u3044\u306B\u306FLINE\u3067\u306E\u30B5\u30A4\u30F3\u30A4\u30F3\u304C\u5FC5\u8981\u3067\u3059\u304C\u3001LIFF Mock\u3067\u306F\u7701\u7565\u3055\u308C\u307E\u3059\u3002"
      }
    },
    /** Shop, under the reserve tickets, and reserve ticket checkout, under the Pay key: your short Sui address, which opens your ticket purchases read from Sui */
    purchases: {
      /** Shop and reserve ticket checkout: the button that opens your ticket purchases, before your short Sui address */
      label: { en: "Purchases", ja: "\u8CFC\u5165\u5C65\u6B74" },
      /** Shop and reserve ticket checkout, purchases list: screen-reader status while Sui is read */
      reading: {
        en: "Reading your ticket purchases from Sui\u2026",
        ja: "Sui\u304B\u3089\u30C1\u30B1\u30C3\u30C8\u8CFC\u5165\u5C65\u6B74\u3092\u8AAD\u307F\u8FBC\u3093\u3067\u3044\u307E\u3059\u2026"
      },
      /** Shop and reserve ticket checkout, purchases list: when Sui couldn't be read, and the Shop under the reserve tickets when where packs are paid didn't load, before Try again and the English words for a report */
      problem: {
        en: "Couldn\u2019t read your ticket purchases from Sui.",
        ja: "Sui\u304B\u3089\u30C1\u30B1\u30C3\u30C8\u8CFC\u5165\u5C65\u6B74\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\u3002"
      },
      /** Shop and reserve ticket checkout, purchases list: when you've never bought a pack */
      none: { en: "No ticket purchases yet.", ja: "\u30C1\u30B1\u30C3\u30C8\u306E\u8CFC\u5165\u5C65\u6B74\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002" },
      /** Shop and reserve ticket checkout, purchases list: the link under the list that reads the next, older page */
      more: { en: "Older purchases", ja: "\u4EE5\u524D\u306E\u8CFC\u5165" },
      /** Shop and reserve ticket checkout, purchases list: read by screen readers only, after what a row shows (the pack, when and its price): where the row goes */
      opensSuiscan: { en: "Opens Suiscan", ja: "Suiscan\u3067\u3072\u3089\u304F" }
    }
  };

  // apps/frontend/src/i18n/strings/ui.ts
  var ui = {
    /** Every button that leads back to your own sticker board, named like its tab: the ticket cards, the Receive gift dialog, Giving's closing screens and gift-received notice, Explore's lifted sticker of your own, the sticker detail's back button */
    backToBoard: { en: "Back to My board", ja: "\u30DE\u30A4\u30DC\u30FC\u30C9\u306B\u623B\u308B" },
    lazyScreen: {
      /** A note at the top of any screen, when the code for what it opened (Explore, the drawing screen, the sticker tray, a sticker's detail, Giving, the stat board, the Mini-game, a gift) didn't load: over the browser's reason, beside Reload */
      didntLoad: {
        en: "Part of Croquis didn\u2019t load. Reload to try again.",
        ja: "\u30AF\u30ED\u30C3\u30AD\u30FC\u306E\u4E00\u90E8\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u3066\u3001\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002"
      },
      /** The same note: the button that reloads the page */
      reload: { en: "Reload", ja: "\u518D\u8AAD\u307F\u8FBC\u307F" }
    },
    sheet: {
      /** Every bottom sheet, such as Accept and Send gratitude: the perforation's name for assistive tech, a button that closes the sheet when tapped or dragged down; {{label}} is the sheet's name */
      close: { en: "Close {{label}}", ja: "\u300C{{label}}\u300D\u3092\u9589\u3058\u308B" }
    },
    /** The line every failure is told in, over Tomato Soft. */
    errorLine: {
      /** Any error line where trying again can work: the quiet link after the sentence that asks again */
      tryAgain: { en: "Try again", ja: "\u3082\u3046\u4E00\u5EA6" },
      /** Under an error line's sentence, and on the sign-in screens when the app couldn't be opened: the small label above the English words behind the failure, which the person can copy into a report */
      details: { en: "Details for a report", ja: "\u5831\u544A\u7528\u306E\u8A73\u7D30" }
    },
    copy: {
      /** Beside fine print that's long or case-sensitive, such as a payment's ID or an error's details: the small button that copies it whole */
      copy: { en: "Copy", ja: "\u30B3\u30D4\u30FC" },
      /** The same button once it has copied */
      copied: { en: "Copied", ja: "\u30B3\u30D4\u30FC\u6E08\u307F" },
      /** The same fine print, under it, when Copy couldn't copy it (LINE's browser can refuse): the line that says to copy it by hand, which stays until the next try */
      notCopied: {
        en: "Couldn\u2019t copy. Touch and hold the text to copy it yourself.",
        ja: "\u30B3\u30D4\u30FC\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u6587\u5B57\u3092\u9577\u62BC\u3057\u3057\u3066\u3001\u3054\u81EA\u8EAB\u3067\u30B3\u30D4\u30FC\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
      }
    },
    /** A gratitude combo's length, counted in hits the way fighting games count it. */
    hitCounter: {
      /** The hit counter, on the stat board's Bests and Explore's Best combo board: the word set in small caps after the count, when it's 1 */
      unit_one: { en: "hit" },
      /** The hit counter: the word set in small caps after the count, such as "64" then "HITS" */
      unit_other: { en: "hits", ja: "\u30D2\u30C3\u30C8" },
      /** The hit counter: what screen readers say in its place when it's 1; {{hits}} is the count */
      spoken_one: { en: "{{hits}} hit" },
      /** The hit counter: what screen readers say in its place, such as "64 hits"; {{hits}} is the count, grouped */
      spoken_other: { en: "{{hits}} hits", ja: "{{hits}}\u30D2\u30C3\u30C8" }
    }
  };

  // apps/frontend/src/i18n/strings/index.ts
  var strings = {
    api,
    app,
    errors,
    explore,
    giving,
    gratitude,
    identity,
    kyotoSeika,
    line,
    pages,
    receiving,
    shop,
    stickerBoard,
    stickerCreation,
    stickers,
    tickets,
    ui
  };

  // apps/frontend/src/i18n/i18n.ts
  var import_meta = {};
  var ZERO_WIDTH_SPACE = String.fromCharCode(8203);
  var WORD_JOINER = String.fromCharCode(8288);
  var OPENING_BRACKET = /[（「『【〔［〈《]/g;
  var withBreakHints = (text) => text.includes(BREAK_HINT) ? text.replace(OPENING_BRACKET, (bracket) => bracket + WORD_JOINER).replaceAll(BREAK_HINT, ZERO_WIDTH_SPACE) : text;
  var breakHints = {
    type: "postProcessor",
    name: "breakHints",
    process: withBreakHints
  };
  instance.use(initReactI18next).use(breakHints).init({
    postProcess: breakHints.name,
    // The person's choice as this device keeps it, or English; main.tsx then applies LINE's language.
    lng: readChosenLanguage() ?? "en",
    fallbackLng: "en",
    supportedLngs: ["en", "ja"],
    resources: {
      en: { translation: resourcesIn(strings, "en") },
      ja: { translation: resourcesIn(strings, "ja") }
    },
    // Both catalogs are bundled, so the first render already has its strings.
    initAsync: false,
    // React escapes what it renders, and LINE's messages are plain text.
    interpolation: { escapeValue: false },
    // Types can't catch a call that passes no variables at all: tests fail on it, and the app logs it.
    missingInterpolationHandler: (text, match) => {
      const problem = `"${text}" was given no ${match[0]}`;
      if (import_meta.env.MODE === "test") throw new Error(problem);
      console.error(problem);
      return match[0];
    }
  }).catch((error) => console.error("i18next didn't start", error));

  // apps/frontend/src/ui/largeScreen.ts
  var import_react12 = __toESM(require_react(), 1);
  var LARGE_MIN_PX = 600;
  var LARGE_SCREEN = `(min-width: ${LARGE_MIN_PX}px) and (min-height: ${LARGE_MIN_PX}px) and (any-pointer: coarse)`;

  // apps/frontend/src/performance/performanceRecorder.ts
  var FIRST_TYPICAL_MS = 1e3 / 30;
  var log = null;
  var stopRecording = null;
  function timeOurWork(label, work) {
    if (!stopRecording) return work();
    const began = performance.now();
    try {
      return work();
    } finally {
      log?.addOurWork(label, performance.now() - began);
    }
  }

  // apps/frontend/src/ui/capturePointer.ts
  function capturePointer(el, pointerId) {
    try {
      el.setPointerCapture(pointerId);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "NotFoundError")) throw error;
    }
  }

  // apps/frontend/src/ui/frameSource.ts
  var browserFrames = {
    now: () => performance.now(),
    request(frame) {
      const id = requestAnimationFrame(frame);
      return () => cancelAnimationFrame(id);
    }
  };

  // apps/frontend/src/sticker-creation/canvas/ops.ts
  var STRIDE = 4;
  var isOp = (step) => step.tool === "brush" || step.tool === "eraser" || step.tool === "fill";

  // apps/frontend/src/sticker-creation/layers/checkpoints.ts
  var CHECKPOINT_COST = 24;
  var HEAD_WINDOW = 3;
  function checkpointToDrop(trim) {
    const { kept, head, budget, justTaken } = trim;
    if (budget > 0 && trim.copiesHeld <= budget) return null;
    let pastHead = null;
    for (const at of kept) if (at > head && (pastHead === null || at > pastHead)) pastHead = at;
    if (pastHead !== null) return pastHead;
    const behind = kept.filter((at) => at <= head).toSorted((a, b) => b - a);
    if (behind.length > HEAD_WINDOW) return thinnest(trim, behind);
    const spared = budget > 0 ? justTaken : null;
    return behind.findLast((at) => at !== spared) ?? null;
  }
  function thinnest({ head, costTo, copiesFreed }, behind) {
    const older = behind.slice(HEAD_WINDOW);
    const freed = older.map(copiesFreed);
    const anyFrees = freed.some((copies) => copies > 0);
    let drop = older[0];
    let lowest = Infinity;
    older.forEach((at, j) => {
      if (anyFrees && freed[j] === 0) return;
      const i = HEAD_WINDOW + j;
      const nearer = i > 0 ? behind[i - 1] : head;
      const farther = i + 1 < behind.length ? behind[i + 1] : 0;
      const gap = costTo(nearer) - costTo(farther);
      const back = costTo(head) - costTo(nearer) + CHECKPOINT_COST;
      const score = gap / back / (anyFrees ? freed[j] : 1);
      if (score <= lowest) {
        lowest = score;
        drop = at;
      }
    });
    return drop;
  }
  function planCheckpoints(steps, cost, copyBudgetFor) {
    const costTo = [0];
    const live = /* @__PURE__ */ new Map();
    const kept = /* @__PURE__ */ new Map();
    let liveVersions = /* @__PURE__ */ new Set();
    const isOwned = (version) => !liveVersions.has(version);
    const heldElsewhere = (version, at) => [...kept].some(([other, versions]) => other !== at && versions.includes(version));
    const copiesHeld = () => new Set([...kept.values()].flat().filter(isOwned)).size;
    const copiesFreed = (at) => (kept.get(at) ?? []).filter((v) => isOwned(v) && !heldElsewhere(v, at)).length;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const head = i + 1;
      costTo.push(costTo[i] + cost(step));
      if (isOp(step)) live.set(step.layer, i);
      else if (step.tool === "clear" || step.tool === "delete") live.delete(step.layer);
      liveVersions = new Set(live.values());
      let justTaken = null;
      const latest = Math.max(0, ...kept.keys());
      if (costTo[head] - costTo[latest] >= CHECKPOINT_COST) {
        kept.set(head, [...live.values()]);
        justTaken = head;
      }
      const budget = copyBudgetFor(live.size);
      for (; ; ) {
        const at = checkpointToDrop({
          kept: [...kept.keys()],
          head,
          costTo: (n) => costTo[n],
          copiesFreed,
          copiesHeld: copiesHeld(),
          budget,
          justTaken
        });
        if (at === null) break;
        kept.delete(at);
      }
    }
    return [...kept.keys()].toSorted((a, b) => a - b);
  }

  // apps/api/src/stickers/imageSides.ts
  var MAX_CUT_SIDE = 640;
  var SHARP_CUT_SIDE = 1600;
  var CUT_PAD = 0.05;
  var imageSideFor = (cutSide) => cutSide + 2 * (Math.ceil(cutSide * CUT_PAD) + 1);
  var MAX_STICKER_IMAGE_SIDE = imageSideFor(MAX_CUT_SIDE);
  var MAX_SHARP_IMAGE_SIDE = imageSideFor(SHARP_CUT_SIDE);

  // packages/db/src/schema/limits.ts
  var MAX_TIME_USED_S = 3 * 60;
  var GIFT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1e3;
  var KYOTO_SEIKA_TIME_USED_S = 30 * 60;
  var MAX_LAYERS = 10;

  // apps/api/src/stickers/timelapseLimit.ts
  var MAX_TIMELAPSE_BYTES = 2 * 1024 * 1024;

  // apps/api/src/ticketDays.ts
  var TOKYO_UTC_OFFSET_MS = 9 * 60 * 60 * 1e3;

  // apps/frontend/src/sticker-creation/layers/layerState.ts
  var FIRST_LAYER = 1;
  var FULL_OPACITY = 100;
  var FIRST_LAYERS = {
    layers: [{ id: FIRST_LAYER, opacity: FULL_OPACITY, locked: false, clipped: false }],
    nextId: FIRST_LAYER + 1
  };
  var LayerStepError = class extends Error {
    stepIndex;
    constructor(message, stepIndex) {
      super(message);
      this.name = "LayerStepError";
      this.stepIndex = stepIndex;
    }
  };
  var NO_SUCH_LAYER = "the sheet has no such layer";
  function describeStep(step) {
    switch (step.tool) {
      case "add":
        return `add layer ${step.layer} at ${step.at}`;
      case "delete":
        return `delete layer ${step.layer}`;
      case "move":
        return `move layer ${step.layer} to ${step.to}`;
      case "opacity":
        return `set layer ${step.layer}'s opacity to ${step.opacity}`;
      case "lock":
      case "clip":
        return `turn ${step.tool} ${step.on ? "on" : "off"} for layer ${step.layer}`;
      case "clear":
        return `clear layer ${step.layer}`;
      default:
        return `${step.tool} on layer ${step.layer}`;
    }
  }
  var isCountUpTo = (v, max) => Number.isInteger(v) && v >= 0 && v <= max;
  var withLayer = (state, at, change) => ({
    ...state,
    layers: state.layers.map((layer, i) => i === at ? { ...layer, ...change } : layer)
  });
  function applyStep(state, step, stepIndex) {
    const refuse = (reason) => new LayerStepError(`${describeStep(step)}: ${reason}`, stepIndex);
    const { layers } = state;
    const at = indexOf(state, step.layer);
    if (step.tool === "add") {
      if (at >= 0) throw refuse("the sheet has that layer already");
      if (step.layer < state.nextId)
        throw refuse(`the sheet has used numbers up to ${state.nextId - 1}`);
      if (layers.length >= MAX_LAYERS) throw refuse(`a sheet holds ${MAX_LAYERS} layers at most`);
      if (!isCountUpTo(step.at, layers.length)) throw refuse(`the sheet has ${layers.length} layers`);
      const added = { id: step.layer, opacity: FULL_OPACITY, locked: false, clipped: false };
      return {
        layers: [...layers.slice(0, step.at), added, ...layers.slice(step.at)],
        // Above every number used, so a layer a delete took out never has its number given again.
        nextId: step.layer + 1
      };
    }
    if (at < 0) throw refuse(NO_SUCH_LAYER);
    switch (step.tool) {
      case "delete":
        if (layers.length === 1) throw refuse("the last layer can't be deleted");
        return { ...state, layers: layers.filter((layer) => layer.id !== step.layer) };
      case "move": {
        if (!isCountUpTo(step.to, layers.length - 1))
          throw refuse(`the sheet has ${layers.length} layers`);
        const rest = layers.filter((layer) => layer.id !== step.layer);
        return { ...state, layers: [...rest.slice(0, step.to), layers[at], ...rest.slice(step.to)] };
      }
      case "opacity":
        if (!isCountUpTo(step.opacity, FULL_OPACITY))
          throw refuse(`opacity is a whole number from 0 to ${FULL_OPACITY}`);
        return withLayer(state, at, { opacity: step.opacity });
      case "lock":
        return withLayer(state, at, { locked: step.on });
      case "clip":
        return withLayer(state, at, { clipped: step.on });
      case "clear":
        return state;
    }
  }
  function applyLayerStep(state, step) {
    return applyStep(state, step, null);
  }
  function baseOf(state, id) {
    const at = indexOf(state, id);
    if (at < 0 || !state.layers[at].clipped) return null;
    for (let i = at - 1; i >= 0; i--) if (!state.layers[i].clipped) return state.layers[i];
    return null;
  }
  var isHidden = (layer) => layer.opacity === 0;
  function indexOf(state, id) {
    return state.layers.findIndex((layer) => layer.id === id);
  }
  function inkAfter(inked, step) {
    if (isOp(step)) inked.add(step.layer);
    else if (step.tool === "clear" || step.tool === "delete" || step.tool === "add")
      inked.delete(step.layer);
  }
  function timelapseStart(steps) {
    const inked = /* @__PURE__ */ new Set();
    let start = 0;
    for (let i = 0; i < steps.length; i++) {
      inkAfter(inked, steps[i]);
      if (inked.size === 0) start = i + 1;
    }
    return start;
  }
  function stateAt(steps, index2) {
    if (!isCountUpTo(index2, steps.length))
      throw new RangeError(`There is no state after ${index2} of ${steps.length} steps`);
    let state = FIRST_LAYERS;
    for (let i = 0; i < index2; i++) {
      const step = steps[i];
      if (!isOp(step)) state = applyStep(state, step, i);
      else if (indexOf(state, step.layer) < 0)
        throw new LayerStepError(`${describeStep(step)}: ${NO_SUCH_LAYER}`, i);
    }
    return state;
  }

  // apps/frontend/src/sticker-creation/layers/layerHistory.ts
  var NO_INK = /* @__PURE__ */ new Set();
  function inkedAfterStep(before, step) {
    if (isOp(step)) return before.has(step.layer) ? before : new Set(before).add(step.layer);
    const empties = step.tool === "clear" || step.tool === "delete" || step.tool === "add";
    if (!empties || !before.has(step.layer)) return before;
    const after = new Set(before);
    after.delete(step.layer);
    return after;
  }
  var LayerHistory = class {
    surface;
    done = [];
    undone = [];
    /** Index n: the layers after the first n steps. */
    states = [FIRST_LAYERS];
    /** Index n: the inked layers after the first n steps. */
    inkedSets = [NO_INK];
    /** Index n: the summed replay cost of the first n steps. */
    costTo = [0];
    /** Each checkpoint's holds, by how many steps it holds the layers after. */
    checkpoints = /* @__PURE__ */ new Map();
    constructor(surface) {
      this.surface = surface;
    }
    get canUndo() {
      return this.done.length > 0;
    }
    get canRedo() {
      return this.undone.length > 0;
    }
    /** The layers at the head. */
    get state() {
      return this.states[this.done.length];
    }
    /** Some layer has ink at the head. */
    get hasInk() {
      return this.inked.size > 0;
    }
    /** Which layers have ink at the head. */
    get inked() {
      return this.inkedSets[this.done.length];
    }
    /** Every step, oldest first: what the drawing kept on the device holds. */
    get steps() {
      return this.done;
    }
    /** The steps the timelapse plays, from the last time no layer had ink, and the layers then. */
    timelapse() {
      const start = timelapseStart(this.done);
      return { steps: this.done.slice(start), start: this.states[start] };
    }
    /** Records an op the surface already shows: a stroke painted live, a fill already written. */
    commit(op) {
      if (indexOf(this.state, op.layer) < 0)
        throw new LayerStepError(
          `${op.tool} on layer ${op.layer}: the sheet has no such layer`,
          null
        );
      this.branch();
      this.record(op, this.state);
      this.trim(this.checkpointIfDue());
    }
    /** Makes a layer change through the surface and records it. */
    perform(step) {
      const before = this.state;
      const after = applyLayerStep(before, step);
      this.surface.apply(step, before);
      this.branch();
      this.record(step, after);
      this.trim(this.checkpointIfDue());
    }
    /**
     * Changes a layer's opacity as one step with the change just before it, when that changed the
     * same layer's opacity and nothing is undone, so back-to-back changes undo together. A change back
     * to where they began leaves no step.
     */
    performOpacity(step) {
      const last = this.done.at(-1);
      if (this.canRedo || last?.tool !== "opacity" || last.layer !== step.layer) {
        this.perform(step);
        return;
      }
      const start = this.states[this.done.length - 1];
      applyLayerStep(start, step);
      this.popHead();
      if (start.layers[indexOf(start, step.layer)].opacity !== step.opacity) {
        this.perform(step);
        return;
      }
      this.branch();
      this.surface.show(this.state);
    }
    /** The step it undid; null with nothing to undo. */
    undo() {
      const step = this.done.at(-1);
      if (!step) return null;
      if (isOp(step) || step.tool === "clear" || step.tool === "delete")
        this.surface.rebuild(step.layer, () => this.rebuild(step.layer, this.done.length - 1));
      this.popHead();
      this.undone.push(step);
      this.surface.show(this.state);
      this.trim(null);
      return step;
    }
    /** The step it redid; null with nothing to redo. */
    redo() {
      const step = this.undone.at(-1);
      if (!step) return null;
      const before = this.state;
      this.surface.apply(step, before);
      this.undone.pop();
      this.record(step, isOp(step) ? before : applyLayerStep(before, step));
      this.surface.show(this.state);
      this.trim(this.checkpointIfDue());
      return step;
    }
    /** Starts over with these steps, replayed in order from blank, with planned checkpoints. Throws a LayerStepError for steps that don't fit. */
    load(steps, paint = true) {
      stateAt(steps, steps.length);
      this.startOver();
      this.replay(steps, paint);
    }
    /** A blank sheet with one layer and nothing to undo or redo. */
    reset() {
      this.startOver();
      this.surface.show(this.state);
    }
    /**
     * Replays every step from blank, as after the surface was resized and cleared, taking the
     * checkpoints a load would; what was undone can still be redone.
     */
    invalidate() {
      const { done, undone } = this;
      this.startOver();
      this.undone = undone;
      this.replay(done);
    }
    /**
     * Lets go of every checkpoint's holds and keeps the steps: as the sheet goes, or to make room when
     * a canvas can't be made. Undo replays from blank until checkpoints are taken again.
     */
    dropCheckpoints() {
      for (const at of [...this.checkpoints.keys()]) this.drop(at);
    }
    /** A new step: what was undone can't come back, nor can the checkpoints past the head. */
    branch() {
      this.undone = [];
      for (const at of [...this.checkpoints.keys()]) if (at > this.done.length) this.drop(at);
    }
    /**
     * Applies `steps` from blank in order, so each fill reads the layers as they were when it was first
     * drawn, taking only the checkpoints the eviction rule would keep after the last.
     */
    replay(steps, paint = true) {
      const planned = new Set(
        planCheckpoints(
          steps,
          (step) => this.surface.cost(step),
          (inkedLayers) => this.surface.copyBudgetFor(inkedLayers)
        )
      );
      for (const step of steps) {
        const before = this.state;
        this.record(step, isOp(step) ? before : applyLayerStep(before, step));
      }
      if (!paint) return;
      for (let i = 0; i < steps.length; i++) {
        this.surface.apply(steps[i], this.states[i]);
        if (planned.has(i + 1)) this.take(i + 1);
      }
      this.surface.show(this.state);
      this.trim(null);
    }
    /** Takes the last step off, with its state, inked layers and cost. */
    popHead() {
      const step = this.done.pop();
      if (!step) return void 0;
      this.states.pop();
      this.inkedSets.pop();
      this.costTo.pop();
      return step;
    }
    record(step, after) {
      const head = this.done.length;
      this.done.push(step);
      this.states.push(after);
      this.inkedSets.push(inkedAfterStep(this.inkedSets[head], step));
      this.costTo.push(this.costTo[head] + this.surface.cost(step));
    }
    /** The step count of the nearest checkpoint at or before `head`; 0, the blank sheet, when none is. */
    nearestCheckpoint(head) {
      let nearest = 0;
      for (const at of this.checkpoints.keys()) if (at <= head && at > nearest) nearest = at;
      return nearest;
    }
    /** Takes a checkpoint at the head once the steps since the last one cost enough; returns where. */
    checkpointIfDue() {
      const head = this.done.length;
      if (this.costTo[head] - this.costTo[this.nearestCheckpoint(head)] < CHECKPOINT_COST)
        return null;
      this.take(head);
      return head;
    }
    take(at) {
      const holds = /* @__PURE__ */ new Map();
      for (const layer of this.inkedSets[at]) holds.set(layer, this.surface.hold(layer));
      this.checkpoints.set(at, holds);
    }
    drop(at) {
      const holds = this.checkpoints.get(at);
      if (!holds) return;
      this.checkpoints.delete(at);
      for (const hold of holds.values()) this.surface.release(hold);
    }
    /** Drops checkpoints by the eviction rule until their copies fit the budget. */
    trim(justTaken) {
      const budget = this.surface.copyBudgetFor(this.inked.size);
      const holdsOf = (at) => [...this.checkpoints.get(at)?.values() ?? []];
      for (; ; ) {
        const at = checkpointToDrop({
          kept: [...this.checkpoints.keys()],
          head: this.done.length,
          costTo: (steps) => this.costTo[steps],
          copiesFreed: (k) => this.surface.copiesFreedBy(holdsOf(k)),
          copiesHeld: this.surface.copiesHeld,
          budget,
          justTaken
        });
        if (at === null) return;
        this.drop(at);
      }
    }
    /**
     * Rebuilds `layer` at the head from its nearest checkpoint, or from blank after its last clear,
     * replaying its own ops since, each as drawn in the layers then.
     */
    rebuild(layer, head) {
      let from = this.nearestCheckpoint(head);
      let hold = this.checkpoints.get(from)?.get(layer) ?? null;
      for (let i = head - 1; i >= from; i--) {
        const step = this.done[i];
        if (step.layer === layer && (step.tool === "clear" || step.tool === "add")) {
          from = i + 1;
          hold = null;
          break;
        }
      }
      this.surface.restore(layer, hold);
      for (let i = from; i < head; i++) {
        const step = this.done[i];
        if (isOp(step) && step.layer === layer) this.surface.apply(step, this.states[i]);
      }
    }
    /** Lets go of every hold and every step, and blanks the layers. */
    startOver() {
      this.dropCheckpoints();
      this.blankLayers();
      this.done = [];
      this.undone = [];
      this.states = [FIRST_LAYERS];
      this.inkedSets = [NO_INK];
      this.costTo = [0];
    }
    /** A failed replay may still hold a layer deleted later in the recording, so clear every used ID. */
    blankLayers() {
      const layers = /* @__PURE__ */ new Set([
        FIRST_LAYER,
        ...this.done.map((step) => step.layer),
        ...this.undone.map((step) => step.layer)
      ]);
      for (const layer of layers) this.surface.restore(layer, null);
    }
  };

  // apps/frontend/src/ui/easing.ts
  var clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  var clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  var lerp = (a, b, t2) => a + (b - a) * t2;
  var cubicBezier = (points) => `cubic-bezier(${points.join(", ")})`;
  var EASE_OUT_POINTS = [0.16, 1, 0.3, 1];
  var EASE_PEEL_POINTS = [0.2, 0.7, 0.2, 1];
  var EASE_OUT = cubicBezier(EASE_OUT_POINTS);
  var EASE_PEEL = cubicBezier(EASE_PEEL_POINTS);
  var EASE_SPRING = cubicBezier([0.34, 1.7, 0.5, 1]);

  // apps/frontend/src/sticker-creation/canvas/strokeCurve.ts
  var CURVE_FLATNESS = 0.25;
  var MAX_HALVINGS = 6;
  var BEZIER_STRAY = 0.75;
  var KNOT_POWER = 0.5;
  var MAX_KEYS = 4;
  var PIECE = 11;
  var pieces = new Float64Array((MAX_HALVINGS + 1) * PIECE);
  function fromSegment(x, y, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const along = dx === 0 && dy === 0 ? 0 : ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy);
    const s = clamp01(along);
    return Math.hypot(x - ax - dx * s, y - ay - dy * s);
  }
  function strays(p) {
    const x0 = pieces[p];
    const y0 = pieces[p + 1];
    const x3 = pieces[p + 6];
    const y3 = pieces[p + 7];
    return BEZIER_STRAY * Math.max(
      fromSegment(pieces[p + 2], pieces[p + 3], x0, y0, x3, y3),
      fromSegment(pieces[p + 4], pieces[p + 5], x0, y0, x3, y3)
    );
  }
  function halve(p) {
    const b = pieces;
    const ax = (b[p] + b[p + 2]) / 2;
    const ay = (b[p + 1] + b[p + 3]) / 2;
    const bx = (b[p + 2] + b[p + 4]) / 2;
    const by = (b[p + 3] + b[p + 5]) / 2;
    const cx = (b[p + 4] + b[p + 6]) / 2;
    const cy = (b[p + 5] + b[p + 7]) / 2;
    const dx = (ax + bx) / 2;
    const dy = (ay + by) / 2;
    const ex = (bx + cx) / 2;
    const ey = (by + cy) / 2;
    const mx = (dx + ex) / 2;
    const my = (dy + ey) / 2;
    const mid = (b[p + 8] + b[p + 9]) / 2;
    const halvings = b[p + 10] + 1;
    const l = p + PIECE;
    b[l] = b[p];
    b[l + 1] = b[p + 1];
    b[l + 2] = ax;
    b[l + 3] = ay;
    b[l + 4] = dx;
    b[l + 5] = dy;
    b[l + 6] = mx;
    b[l + 7] = my;
    b[l + 8] = b[p + 8];
    b[l + 9] = mid;
    b[l + 10] = halvings;
    b[p] = mx;
    b[p + 1] = my;
    b[p + 2] = ex;
    b[p + 3] = ey;
    b[p + 4] = cx;
    b[p + 5] = cy;
    b[p + 8] = mid;
    b[p + 10] = halvings;
  }
  var knot = (ax, ay, bx, by) => Math.max(Math.hypot(bx - ax, by - ay) ** KNOT_POWER, 1e-6);
  var tangent = (pa, pb, pc, da, db, d) => d * ((pb - pa) / da - (pc - pa) / (da + db) + (pc - pb) / db) / 3;
  var StrokeCurve = class {
    /** The stroke's points, flat, `STRIDE` numbers each; the curve appends its pieces' ends. */
    out;
    /** The latest points the curve passes through, flat like `out`: the last one waits for its span. */
    keys = Array.from({ length: MAX_KEYS * STRIDE }, () => 0);
    count = 1;
    /** `out` holds the stroke's first point, already painted. */
    constructor(out) {
      this.out = out;
      this.copyKey(out, out.length - STRIDE, 0);
    }
    /** The line has reached the newest point: none waits for its span. */
    get settled() {
      return this.count === 1;
    }
    /** The newest point the curve passes through. */
    get x() {
      return this.keys[(this.count - 1) * STRIDE];
    }
    get y() {
      return this.keys[(this.count - 1) * STRIDE + 1];
    }
    /** The stroke's first point takes this width, while no span from it has been cut. */
    setFirstWidth(width) {
      if (this.out.length !== STRIDE) return;
      this.out[2] = width;
      this.keys[2] = width;
    }
    /** The curve passes through x, y next, at this width and ms; the span before it is cut. */
    add(x, y, width, t2) {
      const at = this.count * STRIDE;
      const { keys } = this;
      keys[at] = x;
      keys[at + 1] = y;
      keys[at + 2] = width;
      keys[at + 3] = t2;
      this.count++;
      if (this.count < 3) return;
      this.span(this.count - 3);
      if (this.count === MAX_KEYS) this.keep(1);
    }
    /**
     * The line ends at x, y for now, as the nib pauses or lifts: the waiting point moves there, a step
     * it was too near to take, and its span is cut. The next point starts a fresh curve from it.
     */
    settle(x, y) {
      const { keys } = this;
      let last = this.count - 1;
      const at = last * STRIDE;
      if (keys[at] !== x || keys[at + 1] !== y) {
        if (last === 0) {
          this.copyKey(keys, 0, STRIDE);
          keys[STRIDE] = x;
          keys[STRIDE + 1] = y;
          this.count = 2;
          last = 1;
        } else {
          keys[at] = x;
          keys[at + 1] = y;
        }
      }
      if (last > 0) this.span(last - 1);
      this.keep(last);
    }
    /**
     * Fills `into` with the points `settle` at the newest point would add now: the span still waiting
     * for the point after it, cut as if the line ended there. The curve itself doesn't change.
     */
    provisional(into) {
      into.length = 0;
      if (this.count > 1) this.span(this.count - 2, into);
    }
    /** Keeps the keys from `first` on, moved to the front. */
    keep(first) {
      for (let i = first; i < this.count; i++)
        this.copyKey(this.keys, i * STRIDE, (i - first) * STRIDE);
      this.count -= first;
    }
    copyKey(from, at, to) {
      for (let j = 0; j < STRIDE; j++) this.keys[to + j] = from[at + j];
    }
    /** Cuts the span from key `i` to the next, whose neighbors set its tangents, onto `out`. */
    span(i, out = this.out) {
      const k = this.keys;
      const a = i * STRIDE;
      const b = a + STRIDE;
      const x1 = k[a];
      const y1 = k[a + 1];
      const x2 = k[b];
      const y2 = k[b + 1];
      if (x1 === x2 && y1 === y2) return;
      const x0 = i > 0 ? k[a - STRIDE] : 2 * x1 - x2;
      const y0 = i > 0 ? k[a - STRIDE + 1] : 2 * y1 - y2;
      const next = i + 2 < this.count;
      const x3 = next ? k[b + STRIDE] : 2 * x2 - x1;
      const y3 = next ? k[b + STRIDE + 1] : 2 * y2 - y1;
      const d0 = knot(x0, y0, x1, y1);
      const d1 = knot(x1, y1, x2, y2);
      const d2 = knot(x2, y2, x3, y3);
      pieces[0] = x1;
      pieces[1] = y1;
      pieces[2] = x1 + tangent(x0, x1, x2, d0, d1, d1);
      pieces[3] = y1 + tangent(y0, y1, y2, d0, d1, d1);
      pieces[4] = x2 - tangent(x1, x2, x3, d1, d2, d1);
      pieces[5] = y2 - tangent(y1, y2, y3, d1, d2, d1);
      pieces[6] = x2;
      pieces[7] = y2;
      pieces[8] = 0;
      pieces[9] = 1;
      pieces[10] = 0;
      const w1 = k[a + 2];
      const t1 = k[a + 3];
      const w2 = k[b + 2];
      const t2 = k[b + 3];
      for (let top = 1; top > 0; ) {
        const p = --top * PIECE;
        if (pieces[p + 10] < MAX_HALVINGS && strays(p) > CURVE_FLATNESS) {
          halve(p);
          top += 2;
          continue;
        }
        const s = pieces[p + 9];
        out.push(pieces[p + 6], pieces[p + 7], lerp(w1, w2, s), Math.round(lerp(t1, t2, s)));
      }
    }
  };

  // apps/frontend/src/sticker-creation/canvas/brush.ts
  var MIN_STEP = 0.5;
  var PEN_TAPER = { dot: 0.35, travel: 8 };
  var TOUCH_TAPER = { dot: 0.6, travel: 23 };
  var PRESSURE_FLOOR = 0.28;
  var PRESSURE_EXPONENTS = {
    light: 0.5,
    normal: 0.75,
    firm: 1.25
  };
  var MID_PRESSURE = 0.5;
  var PRESSURE_CAP = 1.2;
  var PRESSURE_STEP = 0.01;
  var SPEED_WIDTHS = { fast: 0.68, slow: 1.1 };
  var SPEED_EASE_MS = 47;
  var pressureWidth = (pressure, response) => {
    if (response === "off") return 1;
    const exponent = PRESSURE_EXPONENTS[response];
    const range = 1 - PRESSURE_FLOOR;
    if (pressure <= MID_PRESSURE) return PRESSURE_FLOOR + range * pressure ** exponent;
    const half = PRESSURE_FLOOR + range * MID_PRESSURE ** exponent;
    const rise = (PRESSURE_CAP - 1) * half;
    const slope = range * exponent * MID_PRESSURE ** (exponent - 1);
    const past = clamp01((pressure - MID_PRESSURE) / (1 - MID_PRESSURE));
    return half + rise * (1 - (1 - past) ** (slope * (1 - MID_PRESSURE) / rise));
  };
  var tapered = ({ dot, travel }, reach) => dot + (1 - dot) * Math.min(1, reach / travel);
  var speedWidth = (speed) => clamp(1.12 - 0.15 * speed, SPEED_WIDTHS.fast, SPEED_WIDTHS.slow);
  var previewWidth = (response, pressureVaries) => response === "off" ? 1 : pressureVaries ? pressureWidth(MID_PRESSURE, response) : (SPEED_WIDTHS.fast + SPEED_WIDTHS.slow) / 2;
  var StrokeBuilder = class {
    op;
    size;
    t0;
    /** The pointer's own sample as the last point went in, which a speed-drawn width measures from. */
    nib;
    pen;
    response;
    /** The pen's first reading; null while it has reported none. */
    firstPressure;
    /** Pressure sets the width: this pen has shown its pressure moving, in this stroke or before. */
    pressed;
    /** The pen landed reporting no pressure: its first reading sets the landing's width. */
    landedUnread;
    smoothed;
    /**
     * A pressing pen's last width from its pressure: its width is the mean of that and the next, steady,
     * and a step lands in full by its second sample. Null until it presses.
     */
    pressedWidth = null;
    /** The curve through the points, which adds the points the stroke paints along it. */
    curve;
    taper;
    /** How far the stroke has reached from where it landed, which its taper in goes by. */
    reach = 0;
    /** What `provisional` returns: one array, refilled each call, as a Pencil asks every frame. */
    held = [];
    constructor(start) {
      const {
        tool,
        layer,
        color,
        size,
        x,
        y,
        t: t2,
        T,
        pressure,
        pointerType,
        pressureVaries,
        response
      } = start;
      this.size = size;
      this.t0 = t2;
      this.nib = { x, y, t: t2 };
      this.pen = pointerType === "pen";
      this.response = response;
      this.firstPressure = pressure > 0 ? pressure : null;
      this.pressed = this.pen && pressureVaries;
      this.landedUnread = this.pressed && pressure <= 0;
      this.smoothed = this.pressed ? pressureWidth(pressure, response) : 1;
      this.taper = this.pen ? PEN_TAPER : TOUCH_TAPER;
      const width = tool === "eraser" ? size : size * this.taper.dot * this.smoothed;
      this.op = { tool, layer, color, pts: [x, y, width, 0], T };
      this.curve = new StrokeCurve(this.op.pts);
    }
    get count() {
      return this.op.pts.length / STRIDE;
    }
    /** The line reaches the newest point: nothing waits for the next one to set its curve. */
    get settled() {
      return this.curve.settled;
    }
    /** Whether pressure set this stroke's width: its pen senses pressure. */
    get pressured() {
      return this.pressed;
    }
    /**
     * Adds a point unless it's within half a unit of the last one; says whether it did. `nib` is the
     * pointer's own sample, whose motion since the last point sets a speed-drawn width, as the line
     * lags it under Smoothing; null for a point the line glides to with no new sample, which keeps
     * the width.
     */
    add(x, y, pressure, t2, nib = { x, y, t: t2 }) {
      const { tool } = this.op;
      const dist = Math.hypot(x - this.curve.x, y - this.curve.y);
      if (dist < MIN_STEP) return false;
      let width = this.size;
      if (tool === "brush") {
        if (this.pen && pressure > 0) {
          this.firstPressure ??= pressure;
          if (Math.abs(pressure - this.firstPressure) > PRESSURE_STEP) this.pressed = true;
        }
        const off = this.pen && this.response === "off";
        if (off || !this.pressed) {
          this.pressedWidth = null;
          if (nib) {
            const eased = 1 - Math.exp(-Math.max(0, nib.t - this.nib.t) / SPEED_EASE_MS);
            this.smoothed = lerp(this.smoothed, off ? 1 : speedWidth(this.speedTo(nib)), eased);
          }
        } else if (pressure > 0) {
          const now = pressureWidth(pressure, this.response);
          if (this.landedUnread) {
            this.landedUnread = false;
            this.smoothed = now;
            this.curve.setFirstWidth(this.size * this.taper.dot * now);
          }
          this.smoothed = ((this.pressedWidth ?? this.smoothed) + now) / 2;
          this.pressedWidth = now;
        }
        const { pts } = this.op;
        this.reach = Math.max(this.reach, Math.hypot(x - pts[0], y - pts[1]));
        width *= this.smoothed * tapered(this.taper, this.reach);
      }
      if (nib) {
        this.nib.x = nib.x;
        this.nib.y = nib.y;
        this.nib.t = nib.t;
      }
      this.curve.add(x, y, width, Math.round(t2 - this.t0));
      return true;
    }
    /** How fast the pointer itself moved since the last point, in sheet units per ms. */
    speedTo(nib) {
      const was = this.nib;
      return Math.hypot(nib.x - was.x, nib.y - was.y) / Math.max(1, nib.t - was.t);
    }
    /**
     * The nib paused or lifted at x, y: the line ends there, curved all the way. The point before
     * waits for the next one until then, which sets the curve's way through it.
     */
    settle(x, y) {
      this.curve.settle(x, y);
    }
    /**
     * The points `settle` at the newest point would add now, flat, after the last of `op.pts`: the line
     * the curve holds back, so it can show reaching the nib. Empty when settled. The next call
     * overwrites the same array.
     */
    provisional() {
      this.curve.provisional(this.held);
      return this.held;
    }
    /**
     * The pen lifted and the line settled: narrows a pen's brush stroke over the last
     * `PEN_TAPER.travel` units along its curve, never past the dot it landed with. Once per stroke.
     */
    taperEnd() {
      const { pts, tool } = this.op;
      if (tool !== "brush" || !this.pen) return;
      const tapersIn = [];
      let reach = 0;
      for (let j = 0; j < pts.length; j += STRIDE) {
        reach = Math.max(reach, Math.hypot(pts[j] - pts[0], pts[j + 1] - pts[1]));
        tapersIn.push(tapered(PEN_TAPER, reach));
      }
      let back = 0;
      for (let i = this.count - 1; i > 0 && back < PEN_TAPER.travel; i--) {
        const j = i * STRIDE;
        const out = tapered(PEN_TAPER, back);
        if (out < tapersIn[i]) pts[j + 2] *= out / tapersIn[i];
        back += Math.hypot(pts[j] - pts[j - STRIDE], pts[j + 1] - pts[j - STRIDE + 1]);
      }
    }
  };

  // apps/frontend/src/sticker-creation/canvas/canvasUnavailable.ts
  var CanvasUnavailableError = class extends Error {
    constructor() {
      super("Canvas 2D context unavailable");
      this.name = "CanvasUnavailableError";
    }
  };

  // apps/frontend/src/sticker-creation/canvas/fill.ts
  var FILL_GAP = 2;
  var EMPTY_ALPHA = 128;
  var REGION_TOLERANCE = 72;
  var SAME_COLOR = 8;
  var TUCK = 2;
  var CLEAR = Math.max(TUCK, 1);
  var SIDE = 3;
  var CORNER = 4;
  var FAR = 255;
  var ROOM = 1.5;
  var IN = 1;
  var OUT = 2;
  var UNSEEN = 3;
  var SEARCHED = 4;
  var FLOODING = 5;
  var POCKET = 6;
  var TUCKED = 7;
  var rgbDistance = (data, i, [r, g, b]) => Math.abs(data[i] - r) + Math.abs(data[i + 1] - g) + Math.abs(data[i + 2] - b);
  function findFill(shown, sx, sy, fill, gap, cut) {
    const { width: w, height: h, data } = shown;
    if (sx < 0 || sy < 0 || sx >= w || sy >= h) return null;
    const seed = (sy * w + sx) * 4;
    const target = [data[seed], data[seed + 1], data[seed + 2]];
    const empty = data[seed + 3] < EMPTY_ALPHA;
    if (!empty && rgbDistance(data, seed, fill) < SAME_COLOR) return null;
    const reach = empty ? Math.min(gap * SIDE / 2, FAR - 1) : 0;
    const lines = reach > 0 ? lineDistances(shown, cut, reach, reach * ROOM) : null;
    const far = lines?.far ?? null;
    const margin = reach > 0 ? Math.max(CLEAR, Math.ceil(reach * ROOM / SIDE) + 1) : CLEAR;
    const nearCut = (x02, y02, x12 = x02, y12 = y02) => cut !== void 0 && (cut.left && x02 < margin || cut.top && y02 < margin || cut.right && x12 > w - 1 - margin || cut.bottom && y12 > h - 1 - margin);
    const region = new Uint8Array(w * h);
    const open = (p) => {
      if (region[p]) return false;
      const i = p * 4;
      if (!empty)
        return data[i + 3] >= EMPTY_ALPHA && rgbDistance(data, i, target) < REGION_TOLERANCE;
      return data[i + 3] < EMPTY_ALPHA && (far === null || far[p] > reach);
    };
    const box = lines === null ? scanFill(region, w, h, sx, sy, open, false, nearCut) : closeGaps(region, lines.far, lines.near, reach, w, h, sx, sy, open, nearCut);
    if (box === "past") return "past";
    let edge = [];
    const { x0, y0, x1, y1 } = box;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const p = y * w + x;
        if (region[p] !== IN) continue;
        if (x > 0 && region[p - 1] !== IN || x < w - 1 && region[p + 1] !== IN || y > 0 && region[p - w] !== IN || y < h - 1 && region[p + w] !== IN)
          edge.push(p);
      }
    }
    const tucks = empty ? (a) => a >= EMPTY_ALPHA && a < 255 : (a) => a > 0 && a < EMPTY_ALPHA;
    const reached = { ...box };
    for (let step = 0; step < TUCK && edge.length > 0; step++) {
      const next = [];
      for (const p of edge) {
        const x = p % w;
        const y = (p - x) / w;
        for (let ny = Math.max(0, y - 1); ny <= Math.min(h - 1, y + 1); ny++) {
          for (let nx = Math.max(0, x - 1); nx <= Math.min(w - 1, x + 1); nx++) {
            const q = ny * w + nx;
            if (region[q] === IN || region[q] === TUCKED || !tucks(data[q * 4 + 3])) continue;
            region[q] = TUCKED;
            extend(reached, q, w);
            next.push(q);
          }
        }
      }
      edge = next;
    }
    const bw = reached.x1 - reached.x0 + 1;
    const bh = reached.y1 - reached.y0 + 1;
    const marks = new Uint8Array(bw * bh);
    for (let y = 0; y < bh; y++) {
      const row = (reached.y0 + y) * w + reached.x0;
      for (let x = 0; x < bw; x++) {
        const mark = region[row + x];
        if (mark === IN || mark === TUCKED) marks[y * bw + x] = mark;
      }
    }
    return { box: { x: reached.x0, y: reached.y0, w: bw, h: bh }, marks, paper: empty };
  }
  function writeFill(target, shown, found, fill, locked = false) {
    if (target.width !== shown.width || target.height !== shown.height) {
      throw new Error(
        `A fill found on ${shown.width}\xD7${shown.height} px can't be written on ${target.width}\xD7${target.height} px`
      );
    }
    const { box, marks, paper } = found;
    const [fr, fg, fb] = fill;
    const t2 = target.data;
    let wrote = false;
    for (let y = 0; y < box.h; y++) {
      for (let x = 0; x < box.w; x++) {
        const mark = marks[y * box.w + x];
        if (mark === 0) continue;
        const i = ((box.y + y) * target.width + box.x + x) * 4;
        if (locked) {
          if (t2[i + 3] === 0) continue;
          t2[i] = fr;
          t2[i + 1] = fg;
          t2[i + 2] = fb;
        } else if (!paper) {
          t2[i] = fr;
          t2[i + 1] = fg;
          t2[i + 2] = fb;
          t2[i + 3] = Math.max(t2[i + 3], shown.data[i + 3]);
        } else if (mark === IN) {
          t2[i] = fr;
          t2[i + 1] = fg;
          t2[i + 2] = fb;
          t2[i + 3] = 255;
        } else {
          const a = t2[i + 3] / 255;
          t2[i] = t2[i] * a + fr * (1 - a);
          t2[i + 1] = t2[i + 1] * a + fg * (1 - a);
          t2[i + 2] = t2[i + 2] * a + fb * (1 - a);
          t2[i + 3] = 255;
        }
        wrote = true;
      }
    }
    return wrote;
  }
  function scanFill(region, w, h, sx, sy, open, corners, nearCut) {
    const box = { x0: sx, y0: sy, x1: sx, y1: sy };
    const stack = [sx, sy];
    while (stack.length) {
      const y = stack.pop() ?? 0;
      let x = stack.pop() ?? 0;
      while (x > 0 && open(y * w + x - 1)) x--;
      if (!open(y * w + x)) continue;
      let up = false;
      let down = false;
      if (corners && x > 0) {
        up = y > 0 && open((y - 1) * w + x - 1);
        if (up) stack.push(x - 1, y - 1);
        down = y < h - 1 && open((y + 1) * w + x - 1);
        if (down) stack.push(x - 1, y + 1);
      }
      for (; x < w && open(y * w + x); x++) {
        const p = y * w + x;
        region[p] = IN;
        if (x < box.x0) box.x0 = x;
        if (x > box.x1) box.x1 = x;
        if (y > 0) {
          const next = open(p - w);
          if (next && !up) stack.push(x, y - 1);
          up = next;
        }
        if (y < h - 1) {
          const next = open(p + w);
          if (next && !down) stack.push(x, y + 1);
          down = next;
        }
      }
      if (corners && x < w) {
        if (y > 0 && !up && open((y - 1) * w + x)) stack.push(x, y - 1);
        if (y < h - 1 && !down && open((y + 1) * w + x)) stack.push(x, y + 1);
      }
      if (y < box.y0) box.y0 = y;
      if (y > box.y1) box.y1 = y;
      if (nearCut(box.x0, box.y0, box.x1, box.y1)) return "past";
    }
    return box;
  }
  function closeGaps(region, far, near, reach, w, h, sx, sy, open, nearCut) {
    const lineNear = (p) => far[p] > 0 && far[p] <= reach;
    let start = sy * w + sx;
    if (lineNear(start)) {
      const searched = [start];
      region[start] = SEARCHED;
      let found = -1;
      const search = (q) => {
        if (found >= 0 || region[q] || far[q] === 0) return;
        if (far[q] > reach) {
          found = q;
          return;
        }
        region[q] = SEARCHED;
        searched.push(q);
      };
      for (let head = 0; head < searched.length && found < 0; head++) {
        const p = searched[head];
        const x = p % w;
        if (nearCut(x, (p - x) / w)) return "past";
        eachBeside(p, w, h, search);
      }
      if (found < 0) {
        const box2 = { x0: sx, y0: sy, x1: sx, y1: sy };
        for (const p of searched) {
          region[p] = IN;
          extend(box2, p, w);
        }
        return box2;
      }
      for (const p of searched) region[p] = 0;
      start = found;
    }
    const box = scanFill(region, w, h, start % w, Math.floor(start / w), open, true, nearCut);
    if (box === "past") return "past";
    const claims = [];
    const others = [];
    for (const p of near) {
      const x = p % w;
      if (region[p] === 0 && nearCut(x, (p - x) / w)) {
        region[p] = UNSEEN;
        others.push(p);
      }
    }
    const room = reach * ROOM;
    const band = [];
    const judge = (r) => {
      band.length = 0;
      band.push(r);
      region[r] = FLOODING;
      let deep = false;
      const box2 = { x0: w, y0: h, x1: 0, y1: 0 };
      for (let head = 0; head < band.length; head++) {
        const p = band[head];
        extend(box2, p, w);
        const x = p % w;
        const y = (p - x) / w;
        for (let ny = Math.max(0, y - 1); ny <= Math.min(h - 1, y + 1); ny++) {
          for (let nx = Math.max(0, x - 1); nx <= Math.min(w - 1, x + 1); nx++) {
            const q = ny * w + nx;
            if (far[q] > room) deep = true;
            else if (far[q] > reach && region[q] === 0) {
              region[q] = FLOODING;
              band.push(q);
            }
          }
        }
      }
      const mark = nearCut(box2.x0 - 1, box2.y0 - 1, box2.x1 + 1, box2.y1 + 1) ? UNSEEN : deep ? OUT : POCKET;
      for (const p of band) region[p] = mark;
    };
    const source = (r) => {
      if (region[r] === IN) {
        claims.push(r);
        return;
      }
      if (far[r] <= reach) return;
      if (region[r] === 0) {
        const x = r % w;
        if (far[r] > room) region[r] = nearCut(x, (r - x) / w) ? UNSEEN : OUT;
        else judge(r);
      }
      if (region[r] === OUT || region[r] === UNSEEN) others.push(r);
    };
    for (const q of near) if (region[q] === 0) eachBeside(q, w, h, source);
    for (const p of others) claims.push(p);
    const claimable = (q) => region[q] === POCKET || region[q] === 0 && far[q] > 0 && far[q] <= reach;
    let from = IN;
    let met = false;
    const claim = (q) => {
      const at = region[q];
      if (claimable(q)) {
        region[q] = from;
        claims.push(q);
      } else if (from === IN && at === UNSEEN || from === UNSEEN && at === IN) met = true;
    };
    for (let head = 0; head < claims.length && !met; head++) {
      const p = claims[head];
      from = region[p];
      eachBeside(p, w, h, claim);
    }
    if (met) return "past";
    for (const p of claims) if (region[p] === IN) extend(box, p, w);
    return box;
  }
  function lineDistances(img, cut, reach, room) {
    const { width: w, height: h, data } = img;
    const far = new Uint8Array(w * h).fill(FAR);
    const near = [];
    const left = cut?.left ? FAR : 0;
    const top = cut?.top ? FAR : 0;
    const right = cut?.right ? FAR : 0;
    const bottom = cut?.bottom ? FAR : 0;
    const span = Math.floor(Math.min(Math.floor(room), FAR - 1) / SIDE);
    const { start, cols } = measuredRuns(img, cut, span);
    for (let y = 0; y < h; y++) {
      for (let r = start[y]; r < start[y + 1]; r += 2) {
        for (let x = cols[r]; x <= cols[r + 1]; x++) {
          const p = y * w + x;
          if (data[p * 4 + 3] >= EMPTY_ALPHA) {
            far[p] = 0;
            continue;
          }
          let d = Math.min((x > 0 ? far[p - 1] : left) + SIDE, (y > 0 ? far[p - w] : top) + SIDE);
          if (y > 0 && x > 0) d = Math.min(d, far[p - w - 1] + CORNER);
          if (y > 0 && x < w - 1) d = Math.min(d, far[p - w + 1] + CORNER);
          far[p] = Math.min(d, FAR);
        }
      }
    }
    for (let y = h - 1; y >= 0; y--) {
      for (let r = start[y + 1] - 2; r >= start[y]; r -= 2) {
        for (let x = cols[r + 1]; x >= cols[r]; x--) {
          const p = y * w + x;
          if (far[p] === 0) continue;
          let d = Math.min(
            far[p],
            (x < w - 1 ? far[p + 1] : right) + SIDE,
            (y < h - 1 ? far[p + w] : bottom) + SIDE
          );
          if (y < h - 1 && x < w - 1) d = Math.min(d, far[p + w + 1] + CORNER);
          if (y < h - 1 && x > 0) d = Math.min(d, far[p + w - 1] + CORNER);
          far[p] = d;
          if (d <= reach) near.push(p);
        }
      }
    }
    return { far, near };
  }
  function measuredRuns({ width: w, height: h, data }, cut, span) {
    const first = new Int32Array(h).fill(w);
    const last = new Int32Array(h).fill(-1);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let x = 0;
      while (x < w && data[(row + x) * 4 + 3] < EMPTY_ALPHA) x++;
      if (x === w) continue;
      first[y] = x;
      x = w - 1;
      while (data[(row + x) * 4 + 3] < EMPTY_ALPHA) x--;
      last[y] = x;
    }
    const leftStrip = cut?.left ? 0 : span;
    const topStrip = cut?.top ? 0 : span;
    const rightStrip = cut?.right ? 0 : span;
    const bottomStrip = cut?.bottom ? 0 : span;
    const start = new Int32Array(h + 1);
    const cols = new Int32Array(h * 6);
    let n = 0;
    const add = (row, a, z) => {
      if (a > z) return;
      if (n > row && a <= cols[n - 1] + 1) cols[n - 1] = Math.max(cols[n - 1], z);
      else {
        cols[n++] = a;
        cols[n++] = z;
      }
    };
    for (let y = 0; y < h; y++) {
      const row = n;
      start[y] = row;
      if (y < topStrip || y >= h - bottomStrip) {
        add(row, 0, w - 1);
        continue;
      }
      let a = w;
      let z = -1;
      for (let k = Math.max(0, y - span); k <= Math.min(h - 1, y + span); k++) {
        a = Math.min(a, first[k]);
        z = Math.max(z, last[k]);
      }
      const lineFrom = Math.max(0, a - span);
      const rightFrom = Math.max(0, w - rightStrip);
      add(row, 0, Math.min(leftStrip, w) - 1);
      if (z >= 0 && lineFrom <= rightFrom) add(row, lineFrom, Math.min(w - 1, z + span));
      add(row, rightFrom, w - 1);
    }
    start[h] = n;
    return { start, cols };
  }
  function eachBeside(p, w, h, visit) {
    const x = p % w;
    if (x > 0) visit(p - 1);
    if (x < w - 1) visit(p + 1);
    if (p >= w) visit(p - w);
    if (p < w * (h - 1)) visit(p + w);
  }
  function extend(box, p, w) {
    const x = p % w;
    const y = (p - x) / w;
    if (x < box.x0) box.x0 = x;
    if (x > box.x1) box.x1 = x;
    if (y < box.y0) box.y0 = y;
    if (y > box.y1) box.y1 = y;
  }
  var SQUARE_READS = 3;
  function findOnSheet(sheet, readShown, sx, sy, fill, gap, near) {
    const { width, height } = sheet;
    if (sx < 0 || sy < 0 || sx >= width || sy >= height) return null;
    for (let n = 0, side = near; n < SQUARE_READS; n++, side *= 2) {
      const half = Math.floor(side / 2);
      const x = Math.max(0, sx - half);
      const y = Math.max(0, sy - half);
      const around = {
        x,
        y,
        w: Math.min(width, sx + half + 1) - x,
        h: Math.min(height, sy + half + 1) - y
      };
      const cut = {
        left: around.x > 0,
        top: around.y > 0,
        right: around.x + around.w < width,
        bottom: around.y + around.h < height
      };
      if (n > 0 && around.w * around.h * 2 >= width * height) break;
      const shown2 = readShown(around);
      const found2 = findFill(shown2, sx - around.x, sy - around.y, fill, gap, cut);
      if (found2 !== "past") return found2 && { shown: shown2, at: around, found: found2 };
    }
    const whole = { x: 0, y: 0, w: width, h: height };
    const shown = readShown(whole);
    const found = findFill(shown, sx, sy, fill, gap);
    return found && { shown, at: whole, found };
  }
  function recordFill(after, at, found) {
    const { box, marks } = found;
    const { width, data } = after;
    const spans = [];
    const colors = [];
    let color = -1;
    for (let y = 0; y < box.h; y++) {
      let x = 0;
      while (x < box.w) {
        if (marks[y * box.w + x] === 0) {
          x++;
          continue;
        }
        const x0 = x;
        for (; x < box.w && marks[y * box.w + x] !== 0; x++) {
          const i = ((box.y + y) * width + box.x + x) * 4;
          const rgba = (data[i] << 24 | data[i + 1] << 16 | data[i + 2] << 8 | data[i + 3]) >>> 0;
          if (rgba === color) colors[colors.length - 2]++;
          else {
            color = rgba;
            colors.push(1, rgba);
          }
        }
        spans.push(at.y + box.y + y, at.x + box.x + x0, at.x + box.x + x);
      }
    }
    return {
      box: { x: at.x + box.x, y: at.y + box.y, w: box.w, h: box.h },
      spans: Uint32Array.from(spans),
      colors: Uint32Array.from(colors)
    };
  }
  function replayFill(target, at, written) {
    const { box, spans, colors } = written;
    const { width, height, data } = target;
    if (box.x < at.x || box.y < at.y || box.x + box.w > at.x + width || box.y + box.h > at.y + height) {
      throw new Error(
        `A fill written at (${box.x}, ${box.y}), ${box.w}\xD7${box.h} px, reaches past the ${width}\xD7${height} px at (${at.x}, ${at.y}) it's replayed on`
      );
    }
    let run = 0;
    let left = 0;
    let rgba = 0;
    for (let s = 0; s < spans.length; s += 3) {
      const row = (spans[s] - at.y) * width - at.x;
      for (let x = spans[s + 1]; x < spans[s + 2]; x++) {
        if (left === 0) {
          left = colors[run];
          rgba = colors[run + 1];
          run += 2;
        }
        left--;
        const i = (row + x) * 4;
        data[i] = rgba >>> 24;
        data[i + 1] = rgba >>> 16 & 255;
        data[i + 2] = rgba >>> 8 & 255;
        data[i + 3] = rgba & 255;
      }
    }
  }

  // apps/frontend/src/sticker-creation/canvas/gestures.ts
  var MULTI_FINGER_TAP_MS = 420;
  var MULTI_FINGER_TAP_SLOP = 14;
  var YOUNG_MS = 260;
  var YOUNG_PX = 26;
  var PALM_CONTACT_PX = 80;
  var isPalm = (width, height) => Math.max(width, height) >= PALM_CONTACT_PX;
  var TapRecognizer = class {
    touches = /* @__PURE__ */ new Map();
    gesture = null;
    down(id, x, y, t2, stroke, palm = false) {
      if (!this.gesture) {
        for (const touch of this.touches.values()) if (t2 - touch.t0 >= YOUNG_MS) touch.resting = true;
      }
      this.touches.set(id, { x0: x, y0: y, x, y, t0: t2, resting: palm });
      if (palm) return "ignore";
      const fingers = this.fingers();
      if (fingers < 2 && !this.gesture) return "draw";
      let result = "gesture";
      if (stroke) {
        if (stroke.age >= YOUNG_MS || stroke.moved >= YOUNG_PX) return "ignore";
        result = "cancel-stroke";
      }
      if (!this.gesture) {
        for (const touch of this.touches.values()) {
          touch.x0 = touch.x;
          touch.y0 = touch.y;
        }
        this.gesture = { t0: t2, fingers: 0, moved: 0 };
      }
      this.gesture.fingers = Math.max(this.gesture.fingers, fingers);
      return result;
    }
    move(id, x, y, palm = false) {
      const touch = this.touches.get(id);
      if (!touch) return;
      touch.x = x;
      touch.y = y;
      if (palm) touch.resting = true;
      if (!this.gesture || touch.resting) return;
      this.gesture.moved = Math.max(this.gesture.moved, Math.hypot(x - touch.x0, y - touch.y0));
    }
    /** Forgets every finger and any tap in progress. */
    clear() {
      this.touches.clear();
      this.gesture = null;
    }
    /** The gesture the last counted finger's lift completes, if any. */
    up(id, t2) {
      this.touches.delete(id);
      const gesture = this.gesture;
      if (!gesture || this.fingers() > 0) return null;
      this.gesture = null;
      if (t2 - gesture.t0 >= MULTI_FINGER_TAP_MS || gesture.moved >= MULTI_FINGER_TAP_SLOP)
        return null;
      if (gesture.fingers === 2) return "undo";
      return gesture.fingers >= 3 ? "redo" : null;
    }
    /** The browser took the touch (a scroll or a system gesture): no tap. */
    cancel(id) {
      this.touches.delete(id);
      if (!this.gesture) return;
      this.gesture.moved = Infinity;
      if (this.fingers() === 0) this.gesture = null;
    }
    /** Touches down that count toward a tap. */
    fingers() {
      let count = 0;
      for (const touch of this.touches.values()) if (!touch.resting) count++;
      return count;
    }
  };

  // apps/frontend/src/sticker-creation/canvas/sheetFrame.ts
  var SHEET_SHORT_UNITS = 374;
  var MIN_SHEET_ASPECT = 1;
  var MAX_SHEET_ASPECT = 2.2;
  var MAX_INK_PIXELS = 28e5;
  var MAX_DPR = 3;
  var TENTHS = 10;
  var THOUSANDTHS = 1e3;
  var tenths = (n) => Math.round(n * TENTHS);
  var fromTenths = (n) => n / TENTHS;
  var toTenth = (n) => fromTenths(tenths(n));
  var thousandthBelow = (n) => Math.floor(n * THOUSANDTHS) / THOUSANDTHS;
  var fitScale = (frame, area) => Math.min(area.width / frame.w, area.height / frame.h);
  var maxInkDensity = ({ w, h }) => thousandthBelow(Math.sqrt(MAX_INK_PIXELS / (w * h)));
  function densityFor(size, area, devicePixelRatio) {
    const shown = Math.max(1, fitScale(size, area)) * Math.min(devicePixelRatio || 1, MAX_DPR);
    return Math.min(thousandthBelow(shown), maxInkDensity(size));
  }
  function frameFor(area, devicePixelRatio) {
    const long = Math.max(area.width, area.height);
    const short = Math.min(area.width, area.height);
    const aspect = clamp(long / short, MIN_SHEET_ASPECT, MAX_SHEET_ASPECT);
    const longUnits = Math.round(SHEET_SHORT_UNITS * aspect);
    const size = area.height >= area.width ? { w: SHEET_SHORT_UNITS, h: longUnits } : { w: longUnits, h: SHEET_SHORT_UNITS };
    return { ...size, density: densityFor(size, area, devicePixelRatio) };
  }
  function areaFrame(area, devicePixelRatio) {
    const size = { w: toTenth(area.width), h: toTenth(area.height) };
    return { ...size, density: densityFor(size, area, devicePixelRatio) };
  }
  var boundedFrame = (frame) => {
    const density = Math.min(frame.density, maxInkDensity(frame));
    return density === frame.density ? frame : { ...frame, density };
  };

  // apps/frontend/src/sticker-creation/canvas/stabilization/binary64.ts
  function decode(value) {
    const bytes = new DataView(new ArrayBuffer(8));
    bytes.setFloat64(0, value, false);
    const bits = bytes.getBigUint64(0, false);
    const exponent = Number(bits >> 52n & 2047n);
    const fraction = bits & (1n << 52n) - 1n;
    const mantissa = exponent === 0 ? fraction : 1n << 52n | fraction;
    return {
      mantissa: bits >> 63n ? -mantissa : mantissa,
      exponent: exponent === 0 ? -1074 : exponent - 1075
    };
  }
  function fma64(a, b, c) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return a * b + c;
    if (!Number.isFinite(c)) return c;
    const da = decode(a), db = decode(b), dc = decode(c);
    const product = da.mantissa * db.mantissa;
    if (product === 0n && dc.mantissa === 0n) return a * b + c;
    const productExponent = da.exponent + db.exponent;
    const exponent = Math.min(productExponent, dc.exponent);
    let sum = (product << BigInt(productExponent - exponent)) + (dc.mantissa << BigInt(dc.exponent - exponent));
    if (sum === 0n) return 0;
    const negative = sum < 0n;
    if (negative) sum = -sum;
    const bits = sum.toString(2).length;
    const shift = Math.max(0, bits - 53, -1074 - exponent);
    let rounded = sum >> BigInt(shift);
    if (shift > 0) {
      const remainder = sum - (rounded << BigInt(shift));
      const half = 1n << BigInt(shift - 1);
      if (remainder > half || remainder === half && (rounded & 1n) !== 0n) rounded++;
    }
    const value = Number(rounded) * 2 ** (exponent + shift);
    return negative ? -value : value;
  }

  // apps/frontend/src/sticker-creation/canvas/stabilization/arithmetic.ts
  function truncateToSignedInt32(value) {
    if (Number.isNaN(value)) return 0;
    const integer = Math.max(-2147483648, Math.min(2147483647, Math.trunc(value)));
    return integer === 0 ? 0 : integer;
  }
  function configureLiveQueue(stabilization, taper, fastMotionRequested, slowMotionRequested) {
    const initialWindow = stabilization < 3 ? stabilization : Math.max(2, Math.min(15, Math.min(stabilization, taper) >> 1));
    const fastMotion = !slowMotionRequested && stabilization >= 3 && fastMotionRequested;
    return {
      stabilization,
      taper,
      initialWindow,
      currentWindow: initialWindow,
      fastMotion,
      slowMotion: slowMotionRequested,
      // LSL/ADD use W registers; UCVTF interprets the result as unsigned.
      distanceScale: fastMotion ? (stabilization << 1) + 100 >>> 0 : 0,
      maximumPressureDecline: taper !== 0 ? 1 / taper : 1,
      slowNumerator: 200,
      slowThreshold: 25
    };
  }
  function adjustFixedWindow(currentWindow, stabilization, initialWindow, state) {
    if (state === 0) return initialWindow;
    if (currentWindow < stabilization) {
      currentWindow += Math.min(0.5, (stabilization - currentWindow + 1) / stabilization);
    }
    return Math.min(currentWindow, stabilization);
  }
  function timestampDifference(newer, older) {
    return BigInt.asIntN(64, newer - older);
  }
  function pointDistance(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const squared = fma64(dx, dx, dy * dy);
    return squared === 0 ? 0 : Math.sqrt(squared);
  }
  function adjustFastWindow(input) {
    if (timestampDifference(input.currentTimestamp, input.previousInput.timestamp) > 1000n) {
      return { currentWindow: input.currentWindow, canAverage: false };
    }
    const distance = pointDistance(input.previousInput, input.currentPosition);
    const ratio = (input.distanceScale - distance) / input.distanceScale;
    const changed = input.currentWindow + (ratio > 0 ? 0.5 * ratio : ratio);
    const currentWindow = changed < 2 ? 2 : Math.min(changed, input.state === 0 ? input.initialWindow : input.stabilization);
    return { currentWindow, canAverage: true };
  }
  function includePoint(bounds, point) {
    if (!(bounds.left < bounds.right && bounds.top < bounds.bottom)) {
      bounds.left = point.x;
      bounds.top = point.y;
      bounds.right = point.x + 1e-8;
      bounds.bottom = point.y + 1e-8;
      return;
    }
    if (point.x < bounds.left) bounds.left = point.x;
    else if (point.x >= bounds.right) bounds.right = point.x + 1e-8;
    if (point.y < bounds.top) bounds.top = point.y;
    else if (point.y >= bounds.bottom) bounds.bottom = point.y + 1e-8;
  }
  function adjustSlowWindow(input) {
    const available = Math.min(input.collectedCount, input.historyNewestFirst.length);
    const catchUp = input.catchUpArgument && input.currentWindow < input.stabilization;
    if (available < 1) {
      return {
        currentWindow: input.currentWindow,
        canAverage: false,
        catchUp,
        totalLength: 0,
        positiveSegmentCount: 0,
        scannedCount: 0,
        boundaryAtFirstSegment: false,
        adjusted: false,
        candidate: null,
        target: null
      };
    }
    const limit = Math.min(available, 30);
    let scannedCount = 1;
    let totalLength = 0;
    let positiveSegmentCount = 0;
    let seenPositiveOlderPressure = false;
    let boundaryAtFirstSegment = false;
    const bounds = { left: 0, top: 0, right: 0, bottom: 0 };
    includePoint(bounds, input.historyNewestFirst[0]);
    for (let i = 1; i < limit; i++) {
      const older = input.historyNewestFirst[i];
      const distance = pointDistance(input.historyNewestFirst[i - 1], older);
      scannedCount = i + 1;
      if (distance > 0) {
        totalLength += distance;
        positiveSegmentCount++;
        includePoint(bounds, older);
      }
      if (older.pressure > 0) seenPositiveOlderPressure = true;
      else if (seenPositiveOlderPressure || input.state === 0) {
        boundaryAtFirstSegment = scannedCount === 2;
        break;
      }
    }
    let currentWindow = input.currentWindow;
    if (boundaryAtFirstSegment) currentWindow = catchUp ? input.initialWindow : 0;
    const meanLength = positiveSegmentCount >= 1 ? totalLength / positiveSegmentCount : 0;
    if (!(meanLength > 0 || catchUp)) {
      return {
        currentWindow,
        canAverage: Math.trunc(currentWindow) > 0,
        catchUp,
        totalLength,
        positiveSegmentCount,
        scannedCount,
        boundaryAtFirstSegment,
        adjusted: false,
        candidate: null,
        target: null
      };
    }
    const difference = input.slowThreshold / 10 - meanLength;
    let candidate = input.stabilization;
    if (difference > 0) {
      const dx = bounds.right - bounds.left;
      const dy = bounds.bottom - bounds.top;
      const diagonal = Math.sqrt(fma64(dx, dx, dy * dy));
      candidate = truncateToSignedInt32(
        input.slowNumerator / 10 * difference * (diagonal / totalLength)
      );
    }
    const target = Math.max(candidate, input.state === 0 ? input.initialWindow : input.stabilization);
    const step = catchUp ? 0.5 : 0.25;
    if (step > Math.abs(currentWindow - target)) currentWindow = target;
    else if (currentWindow > target) currentWindow -= step;
    else if (currentWindow < target) currentWindow += step;
    currentWindow = Math.min(currentWindow, scannedCount);
    if (!catchUp) currentWindow = Math.min(currentWindow, available - 1);
    currentWindow = Math.min(currentWindow, 100);
    return {
      currentWindow,
      canAverage: Math.trunc(currentWindow) > 0,
      catchUp,
      totalLength,
      positiveSegmentCount,
      scannedCount,
      boundaryAtFirstSegment,
      adjusted: true,
      candidate,
      target
    };
  }
  function averageFractionalHistory(historyNewestFirst, currentWindow, currentTimestamp) {
    if (!(currentWindow >= 1) || !Number.isFinite(currentWindow)) {
      throw new RangeError("The averaging helper requires a finite window of at least one.");
    }
    const whole = Math.trunc(currentWindow);
    const fraction = currentWindow - whole;
    let last;
    let repeated = false;
    let x = 0;
    let y = 0;
    let pressure = 0;
    for (let i = 0; i < whole; i++) {
      const candidate = historyNewestFirst[i];
      if (!repeated && candidate && timestampDifference(currentTimestamp, candidate.timestamp) <= 1000n) {
        last = candidate;
      } else {
        repeated = true;
      }
      if (!last) return null;
      x += last.x;
      y += last.y;
      pressure += last.pressure;
    }
    const oldestWholeSampleTimestamp = last?.timestamp ?? historyNewestFirst[0]?.timestamp;
    if (oldestWholeSampleTimestamp === void 0) return null;
    if (fraction !== 0) {
      const candidate = historyNewestFirst[whole];
      if (!repeated && candidate && timestampDifference(currentTimestamp, candidate.timestamp) <= 1000n) {
        last = candidate;
      }
      if (!last) return null;
      x = fma64(last.x, fraction, x);
      y = fma64(last.y, fraction, y);
      pressure = fma64(last.pressure, fraction, pressure);
    }
    const reciprocal = 1 / currentWindow;
    return {
      x: x * reciprocal,
      y: y * reciprocal,
      pressure: pressure * reciprocal,
      oldestWholeSampleTimestamp
    };
  }
  function extrapolateNonpositivePressure(incomingPressure, state, previousStoredInputPressure, previousPreviousStoredInputPressure) {
    if (incomingPressure > 0 || state === 0 || previousPreviousStoredInputPressure <= previousStoredInputPressure + 0.02) {
      return incomingPressure;
    }
    const decline = previousPreviousStoredInputPressure - previousStoredInputPressure;
    return Math.max(-0.2, Math.min(0, previousStoredInputPressure - decline));
  }
  function limitPressureDecline(pressure, previousOutputPressure, maximumDecline) {
    return previousOutputPressure - pressure > maximumDecline ? previousOutputPressure - maximumDecline : pressure;
  }
  function interpolatePressureZero(current, pressure, previous, previousPressure) {
    if (previousPressure > pressure + 1e-8) {
      const fraction = previousPressure / (previousPressure - pressure);
      return {
        x: previous.x + (current.x - previous.x) * fraction,
        y: previous.y + (current.y - previous.y) * fraction,
        pressure: 0
      };
    }
    return { x: current.x, y: current.y, pressure: 0 };
  }
  function endingMovementThreshold(taper, currentWindow) {
    if (taper === 0) return 2;
    return Math.max(0.5, fma64(-currentWindow, 0.04, fma64(-taper, 0.04, 2)));
  }
  function shouldEndForMovement(current, previous, previousPrevious, taper, currentWindow) {
    const dx = current.x - previous.x;
    const dy = current.y - previous.y;
    const px = previous.x - previousPrevious.x;
    const py = previous.y - previousPrevious.y;
    if (fma64(dx, px, dy * py) < 0) return true;
    const squared = fma64(dx, dx, dy * dy);
    const previousSquared = fma64(px, px, py * py);
    const threshold = endingMovementThreshold(taper, currentWindow);
    return squared <= threshold * threshold && squared < previousSquared;
  }
  function adjustOutputPhase(input) {
    let { phase, state, timestampGate, pressure } = input;
    let current = { ...input.current };
    let firstEndingPacket = false;
    const result = () => ({ phase, state, timestampGate, ...current, pressure });
    const finish = () => {
      phase = 3;
      state = 0;
      timestampGate = true;
      return result();
    };
    if (phase === 2) {
      if (state === 0) {
        state = 1;
        return result();
      }
      phase = 1;
    } else if (phase === 3) {
      if (state === 0) {
        pressure = 0;
        timestampGate = true;
        return result();
      }
      if (state === 1) {
        state = 2;
        timestampGate = false;
      }
      phase = 1;
      firstEndingPacket = true;
    }
    if (state === 0) return result();
    if (input.limitDecline) {
      pressure = limitPressureDecline(pressure, input.previousPressure, input.maximumDecline);
    }
    if (pressure <= 0) {
      if (!input.retainAtZero) {
        const zero = interpolatePressureZero(
          current,
          pressure,
          input.previous,
          input.previousPressure
        );
        current = { x: zero.x, y: zero.y };
        pressure = 0;
        return finish();
      }
      pressure = 0;
    }
    if (state === 2 && !firstEndingPacket && shouldEndForMovement(
      current,
      input.previous,
      input.previousPrevious,
      input.taper,
      input.currentWindow
    ))
      return finish();
    return result();
  }
  function evaluateOutputGate(input) {
    let rememberedSkippedCount = input.rememberedSkippedCount;
    let suppress = false;
    if (input.gatingRequested && input.phase === 1) {
      if (input.timestampGate) {
        suppress = timestampDifference(input.currentTimestamp, input.previousEmittedTimestamp) < input.interval;
        if (!suppress) rememberedSkippedCount = input.skippedCount;
      } else suppress = input.skippedCount < rememberedSkippedCount;
    }
    return {
      emit: !suppress,
      skippedCount: suppress ? input.skippedCount + 1 | 0 : 0,
      rememberedSkippedCount,
      previousEmittedTimestamp: suppress ? input.previousEmittedTimestamp : input.currentTimestamp
    };
  }
  function terminalPrefeedCount(currentWindow, taper) {
    return Math.max(0, truncateToSignedInt32(currentWindow) - taper | 0);
  }

  // apps/frontend/src/sticker-creation/canvas/stabilization/queue.ts
  function supported(condition, message) {
    if (!condition) throw new RangeError(message);
  }
  var LiveQueue = class {
    data;
    history;
    constructor(bytes, initialHistoryOldestFirst = []) {
      supported(bytes.byteLength === 236, "Live queue requires 236 state bytes");
      this.data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      this.history = initialHistoryOldestFirst.map((sample) => ({ ...sample }));
    }
    ingest(input) {
      const raw = this.data;
      if (input.bypass)
        return {
          emitted: true,
          phase: input.phase,
          output: { x: input.x, y: input.y, pressure: input.pressure }
        };
      const state = raw.getInt32(136, true);
      const pressure = extrapolateNonpositivePressure(
        input.pressure,
        state,
        raw.getFloat64(200, true),
        raw.getFloat64(208, true)
      );
      this.history.push({ x: input.x, y: input.y, pressure, timestamp: input.timestamp });
      if (this.history.length > 1e3) this.history.shift();
      raw.setBigUint64(48, BigInt(this.history.length), true);
      raw.setInt32(56, this.history.length, true);
      let current = { x: input.x, y: input.y, pressure };
      let oldest = input.timestamp;
      const stabilization = raw.getInt32(60, true), initialWindow = raw.getInt32(80, true);
      const slow = raw.getInt32(68, true) !== 0;
      if (stabilization > 0 || slow) {
        let currentWindow = raw.getFloat64(88, true), canAverage = true;
        const newestFirst = [...this.history].reverse();
        if (raw.getInt32(64, true) !== 0 && this.history.length >= 2) {
          ({ currentWindow, canAverage } = adjustFastWindow({
            currentWindow,
            stabilization,
            initialWindow,
            distanceScale: raw.getFloat64(96, true),
            state,
            previousInput: newestFirst[1],
            currentPosition: input,
            currentTimestamp: input.timestamp
          }));
        } else if (slow && stabilization <= 30) {
          ({ currentWindow, canAverage } = adjustSlowWindow({
            currentWindow,
            stabilization,
            initialWindow,
            state,
            catchUpArgument: input.catchUp,
            collectedCount: this.history.length,
            historyNewestFirst: newestFirst,
            slowNumerator: raw.getInt32(72, true),
            slowThreshold: raw.getInt32(76, true)
          }));
        } else currentWindow = adjustFixedWindow(currentWindow, stabilization, initialWindow, state);
        supported(
          Number.isFinite(currentWindow) && currentWindow >= 0 && currentWindow <= 1e3,
          "computed H is outside bounded [0,1000] reference domain"
        );
        raw.setFloat64(88, currentWindow, true);
        if (canAverage) {
          supported(
            currentWindow >= 1,
            "fixed/fast subunit-window arithmetic is outside the existing reference helper domain"
          );
          const averaged = averageFractionalHistory(newestFirst, currentWindow, input.timestamp);
          if (averaged) {
            current = { x: averaged.x, y: averaged.y, pressure: averaged.pressure };
            oldest = averaged.oldestWholeSampleTimestamp;
          }
        }
      }
      raw.setBigUint64(128, BigInt.asUintN(64, oldest), true);
      const previous = { x: raw.getFloat64(144, true), y: raw.getFloat64(152, true) };
      const adjusted = adjustOutputPhase({
        phase: input.phase,
        state,
        timestampGate: raw.getInt32(224, true) !== 0,
        current,
        pressure: current.pressure,
        previous,
        previousPrevious: { x: raw.getFloat64(160, true), y: raw.getFloat64(168, true) },
        previousPressure: raw.getFloat64(176, true),
        limitDecline: raw.getInt32(216, true) !== 0,
        retainAtZero: raw.getInt32(220, true) !== 0,
        maximumDecline: raw.getFloat64(112, true),
        taper: raw.getInt32(104, true),
        currentWindow: raw.getFloat64(88, true)
      });
      raw.setInt32(136, adjusted.state, true);
      raw.setInt32(224, Number(adjusted.timestampGate), true);
      const gate = evaluateOutputGate({
        gatingRequested: input.gating,
        phase: adjusted.phase,
        timestampGate: adjusted.timestampGate,
        currentTimestamp: input.timestamp,
        previousEmittedTimestamp: raw.getBigInt64(120, true),
        interval: input.interval,
        skippedCount: raw.getInt32(228, true),
        rememberedSkippedCount: raw.getInt32(232, true)
      });
      raw.setInt32(228, gate.skippedCount, true);
      raw.setInt32(232, gate.rememberedSkippedCount, true);
      raw.setBigUint64(120, BigInt.asUintN(64, gate.previousEmittedTimestamp), true);
      raw.setFloat64(160, previous.x, true);
      raw.setFloat64(168, previous.y, true);
      raw.setFloat64(144, adjusted.x, true);
      raw.setFloat64(152, adjusted.y, true);
      raw.setFloat64(208, raw.getFloat64(200, true), true);
      raw.setFloat64(200, pressure, true);
      raw.setFloat64(184, input.x, true);
      raw.setFloat64(192, input.y, true);
      raw.setFloat64(176, adjusted.pressure, true);
      return {
        emitted: gate.emit,
        phase: gate.emit ? adjusted.phase : input.phase,
        ...gate.emit ? { output: { x: adjusted.x, y: adjusted.y, pressure: adjusted.pressure } } : {}
      };
    }
  };
  function createLiveQueue(stabilization, taper = 0, fast = false, slow = false) {
    supported(
      Number.isInteger(stabilization) && stabilization >= 0 && stabilization <= 1e3,
      "Stabilization must be an integer from 0 through 1000"
    );
    supported(
      Number.isInteger(taper) && taper >= 0 && taper <= 1e3,
      "Taper must be an integer from 0 through 1000"
    );
    const queue = new LiveQueue(new Uint8Array(236));
    const raw = queue.data;
    const config = configureLiveQueue(stabilization, taper, fast, slow);
    raw.setInt32(60, stabilization, true);
    raw.setInt32(64, Number(config.fastMotion), true);
    raw.setInt32(68, Number(config.slowMotion), true);
    raw.setInt32(72, config.slowNumerator, true);
    raw.setInt32(76, config.slowThreshold, true);
    raw.setInt32(80, config.initialWindow, true);
    raw.setFloat64(88, config.currentWindow, true);
    raw.setFloat64(96, config.distanceScale, true);
    raw.setInt32(104, taper, true);
    raw.setFloat64(112, config.maximumPressureDecline, true);
    raw.setInt32(224, 1, true);
    return queue;
  }

  // apps/frontend/src/sticker-creation/canvas/stabilizer.ts
  var MAX_RELEASE_PACKETS = 2048;
  var StabilizationError = class extends Error {
    constructor(message) {
      super(message);
      this.name = "StabilizationError";
    }
  };
  function validate(sample) {
    if (![sample.x, sample.y, sample.pressure, sample.t].every(Number.isFinite) || sample.pressure < 0 || sample.pressure > 1 || !Number.isSafeInteger(Math.trunc(sample.t)))
      throw new StabilizationError("The pointer supplied an invalid position, pressure, or timestamp.");
  }
  var Stabilizer = class {
    initial;
    queue;
    pen;
    interval;
    latest;
    closed = false;
    constructor(first, smoothing, pen, interval = 0n) {
      validate(first);
      if (!Number.isFinite(smoothing))
        throw new StabilizationError("The stabilization strength is not finite.");
      this.queue = createLiveQueue(Math.round(Math.max(0, Math.min(100, smoothing))));
      this.queue.data.setInt32(216, 1, true);
      this.pen = pen;
      this.interval = interval;
      this.latest = { ...first };
      const initial = this.ingest({ ...first, pressure: pen ? first.pressure : 1 }, 2, true);
      if (!initial) throw new StabilizationError("The initial stabilization packet was suppressed.");
      this.initial = initial;
    }
    /** Latest emitted point; the curve must end here rather than at the unfiltered pointer. */
    get position() {
      return this.latest;
    }
    /** A native-style contact packet may be suppressed while still advancing queue state. */
    add(sample) {
      if (this.closed) return [];
      validate(sample);
      const output = this.ingest({ ...sample, pressure: this.pen ? sample.pressure : 1 }, 2, true);
      return output ? [output] : [];
    }
    /**
     * Recovered release prefeed, then an explicit zero-pressure flush when needed.
     * All generated outputs retain the actual lift's time. Browser input ends at
     * pointerup, so a pending native ending is completed synchronously here.
     */
    finish(sample) {
      if (this.closed) return [];
      validate(sample);
      this.closed = true;
      const raw = this.queue.data;
      raw.setInt32(224, 0, true);
      const outputs = [];
      const count = terminalPrefeedCount(raw.getFloat64(88, true), raw.getInt32(104, true));
      for (let index2 = 0; index2 < count; index2++) {
        const output = this.ingest(sample, 1, true);
        if (output) outputs.push(output);
        if (raw.getInt32(136, true) === 0) return outputs;
      }
      const released = this.ingest(sample, 3, true);
      if (released) outputs.push(released);
      if (raw.getInt32(136, true) === 0) return outputs;
      raw.setInt32(136, 2, true);
      raw.setInt32(224, 0, true);
      for (let index2 = outputs.length; index2 < MAX_RELEASE_PACKETS; index2++) {
        const output = this.ingest({ ...sample, pressure: 0 }, 1, false);
        if (output) outputs.push(output);
        if (raw.getInt32(136, true) === 0) return outputs;
      }
      throw new StabilizationError("Stabilization could not complete this stroke within its release limit.");
    }
    ingest(sample, phase, gating) {
      let result;
      try {
        result = this.queue.ingest({
          x: sample.x,
          y: sample.y,
          pressure: sample.pressure,
          timestamp: BigInt(Math.trunc(sample.t)),
          phase,
          catchUp: false,
          gating,
          interval: this.interval,
          bypass: false
        });
      } catch (error) {
        throw new StabilizationError(`Stabilization failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (!result.output) return null;
      const output = { ...result.output, t: sample.t };
      if (![output.x, output.y, output.pressure].every(Number.isFinite))
        throw new StabilizationError("Stabilization produced a nonfinite point or pressure.");
      this.latest = output;
      return output;
    }
  };

  // apps/frontend/src/sticker-creation/canvas/inkEngine.ts
  var FILL_TAP_SLOP = 10;
  var BLOCKED_DRAG = 8;
  var CANCEL_KEEPS = 4;
  var INK_WORK = {
    paint: "ink paint",
    fill: "ink fill",
    replay: "ink replay",
    commit: "ink commit"
  };
  var swallowed = (pointerType) => ({ pointerType, kind: "swallowed" });
  var isStylus = (touch) => "touchType" in touch && touch.touchType === "stylus";
  var frontOf = (state) => state.layers[state.layers.length - 1];
  function successorOf(state, id) {
    const at = indexOf(state, id);
    return (state.layers[at - 1] ?? state.layers[at + 1]).id;
  }
  var changesInk = (step) => isOp(step) || step.tool === "clear" || step.tool === "delete";
  var opName = (op) => op.tool === "fill" ? "fill" : `${op.tool} stroke`;
  var InkEngine = class {
    /** What the drawing screen last set. */
    latest;
    ink;
    history;
    display;
    events;
    frames;
    taps = new TapRecognizer();
    /** The layer strokes and fills land on. */
    current = FIRST_LAYER;
    /** Each layer's ink version; a new map at each change, so a view handed out never changes. */
    versions = /* @__PURE__ */ new Map();
    /** The last version given out. */
    inkChanges = 0;
    live = null;
    suspended = false;
    needsReplay = false;
    /**
     * Each pointer down on the sheet, by id; every one is captured, so its lift reaches the sheet.
     * Every touch is the tap recognizer's too, whatever its role, until a pen lands.
     */
    pointers = /* @__PURE__ */ new Map();
    /** The pointer whose press is closing a panel, until the engine hears it land. */
    closing = null;
    /** Every finger left the screen: the next touch to land is the only one down. */
    fingersGone = false;
    /** This page's pen has shown its pressure moving: its strokes start at their first sample's width. */
    pressurePen = false;
    /** A hover ring shows. */
    hovering = false;
    cancelFrame = null;
    /** The sheet's frame; null until its area is measured or a kept drawing brings one. */
    sheet = null;
    /**
     * How the frame is decided at the next measure: it follows the area while the sheet is blank,
     * takes the area itself for a drawing kept without one, and stays once the drawing has marks.
     */
    frameRule = "follows";
    locate = () => ({ left: 0, top: 0, width: this.sheet?.w ?? 1 });
    /** Where the paper was and how many CSS px a unit spanned there, as the pointer landed. */
    origin = { left: 0, top: 0, scale: 1 };
    captureTarget = null;
    /** The engine owns `ink` and `display` from here on, and lets them go on `dispose`. */
    constructor(ink, display, settings, events, frames = browserFrames) {
      this.ink = ink;
      this.display = display;
      this.latest = settings;
      this.events = events;
      this.frames = frames;
      this.history = new LayerHistory(ink);
    }
    get settings() {
      return this.latest;
    }
    /** A sheet that stops taking ink ends accepted strokes and drops held contacts. */
    set settings(next) {
      const wasAvailable = !this.latest.locked && !this.latest.paused && !this.latest.panelOpen;
      const unavailable = next.locked || next.paused || next.panelOpen;
      const locking = next.locked && !this.latest.locked;
      this.latest = next;
      if (wasAvailable && unavailable) {
        this.endStroke(false);
        this.taps.clear();
        this.swallowWhere(() => true);
      }
      if (locking && !this.suspended && !this.needsReplay)
        this.withRoom("restoring layer opacity", () => this.display.previewOpacity(null));
    }
    /** Listens for pointers on the sheet; returns the detach. */
    attach(sheet) {
      this.captureTarget = sheet;
      this.locate = () => sheet.getBoundingClientRect();
      const onDown = (e) => {
        this.down(e);
        if (this.pointers.has(e.pointerId)) capturePointer(sheet, e.pointerId);
      };
      const onMove = (e) => this.move(e);
      const onUp = (e) => this.up(e);
      const onCancel = (e) => this.cancel(e);
      const onLeave = () => this.leave();
      const onLostCapture = (e) => {
        if (this.pointers.has(e.pointerId)) this.cancel(e);
      };
      const prevent = (e) => e.preventDefault();
      const touch = { passive: false };
      const onTouchEnd = (e) => {
        if (e.touches.length === 0) this.screenClear();
        const pencil = Array.from(e.changedTouches).find(isStylus);
        if (pencil) this.pencilLifted(pencil, e.timeStamp);
      };
      document.addEventListener("touchend", onTouchEnd);
      document.addEventListener("touchcancel", onTouchEnd);
      sheet.addEventListener("pointerdown", onDown);
      sheet.addEventListener("pointermove", onMove);
      sheet.addEventListener("pointerup", onUp);
      sheet.addEventListener("pointercancel", onCancel);
      sheet.addEventListener("lostpointercapture", onLostCapture);
      sheet.addEventListener("pointerleave", onLeave);
      sheet.addEventListener("contextmenu", prevent);
      sheet.addEventListener("touchstart", prevent, touch);
      sheet.addEventListener("touchmove", prevent, touch);
      document.addEventListener("gesturestart", prevent);
      return () => {
        if (this.captureTarget === sheet) this.captureTarget = null;
        sheet.removeEventListener("pointerdown", onDown);
        sheet.removeEventListener("pointermove", onMove);
        sheet.removeEventListener("pointerup", onUp);
        sheet.removeEventListener("pointercancel", onCancel);
        sheet.removeEventListener("lostpointercapture", onLostCapture);
        sheet.removeEventListener("pointerleave", onLeave);
        sheet.removeEventListener("contextmenu", prevent);
        sheet.removeEventListener("touchstart", prevent);
        sheet.removeEventListener("touchmove", prevent);
        document.removeEventListener("gesturestart", prevent);
        document.removeEventListener("touchend", onTouchEnd);
        document.removeEventListener("touchcancel", onTouchEnd);
        this.cancelFrame?.();
        this.cancelFrame = null;
      };
    }
    /** Every finger left the screen, so whatever lifts went missing, the next touch is the only one down. */
    screenClear() {
      this.fingersGone = true;
    }
    /**
     * The pointer's press closed a panel: once it lands it draws, fills and hints nothing until it
     * lifts. Called as the press begins, before the sheet hears it.
     */
    swallow(pointerId) {
      this.closing = pointerId;
    }
    /**
     * The Pencil's touch ended with its pen stroke still live: its pointerup is late or lost, so the
     * stroke ends where the touch lifted, whichever of the two the browser sends first.
     */
    pencilLifted(touch, time) {
      const live = this.live;
      if (live?.pointerType !== "pen") return;
      this.pointers.delete(live.id);
      [live.x, live.y] = this.toSheet(touch);
      [live.cssX, live.cssY] = this.toStrokeCss(touch, live.scale);
      live.t = Math.max(live.t, time);
      this.endStroke(false);
    }
    down(e) {
      if (this.suspended || this.needsReplay && !this.resume()) return;
      this.hideHover();
      const s = this.settings;
      const { pointerId: id, pointerType } = e;
      const closesPanel = this.closing === id;
      this.closing = null;
      if (s.locked || !this.sheet || pointerType === "mouse" && e.button !== 0) return;
      if (this.pointers.get(id)?.kind === "stroke") this.endStroke(false);
      this.pointers.delete(id);
      if (pointerType === "touch") {
        if (this.fingersGone) this.forgetTouches();
        if (this.live?.pointerType === "pen") return;
        const stroke = this.live?.pointerType === "touch" ? this.live : null;
        const result = this.taps.down(
          id,
          e.clientX,
          e.clientY,
          e.timeStamp,
          stroke ? { age: e.timeStamp - stroke.t0, moved: stroke.moved * this.origin.scale } : void 0,
          this.palmContact(e)
        );
        this.pointers.set(id, { pointerType, kind: "tap" });
        if (result === "cancel-stroke") this.endStroke(true);
        if (result === "cancel-stroke" || result === "gesture")
          this.swallowWhere((role) => role.kind === "fill" || role.kind === "blocked");
        if (result !== "draw") return;
      } else if (pointerType === "pen") {
        this.events.onPen();
        if (this.live?.pointerType === "pen") this.endStroke(false);
        else if (this.live) this.endStroke(true);
        this.taps.clear();
        for (const [other, role] of this.pointers) {
          if (role.pointerType === "pen") this.pointers.delete(other);
          else this.pointers.set(other, swallowed(role.pointerType));
        }
      }
      if (this.live || this.filling()) return;
      if (closesPanel) {
        this.pointers.set(id, swallowed(pointerType));
        return;
      }
      if (pointerType === "touch" && s.inputMode === "pencilOnly") return;
      e.preventDefault();
      const by = s.paused ? "paused" : this.currentHidden() ? "hidden" : null;
      if (by) {
        if (pointerType === "touch")
          this.pointers.set(id, { pointerType, kind: "blocked", by, cx: e.clientX, cy: e.clientY });
        else {
          this.pointers.set(id, swallowed(pointerType));
          this.blocked(by);
        }
        return;
      }
      this.origin = this.place();
      const [x, y] = this.toSheet(e);
      if (s.tool === "fill")
        this.pointers.set(id, { pointerType, kind: "fill", x, y, cx: e.clientX, cy: e.clientY });
      else this.beginStroke(e, x, y);
    }
    move(e) {
      const id = e.pointerId;
      const role = this.pointers.get(id);
      if (e.pointerType === "pen" && e.buttons === 0 && role?.kind !== "stroke") {
        this.hover(e);
        return;
      }
      if (!role) return;
      if (e.pointerType === "touch") {
        const palm = this.palmContact(e);
        this.taps.move(id, e.clientX, e.clientY, palm);
        if (palm && (role.kind === "stroke" || role.kind === "fill")) {
          if (role.kind === "stroke") this.endStroke(true);
          this.pointers.set(id, swallowed(role.pointerType));
          return;
        }
      }
      if (role.kind === "blocked") {
        if (Math.hypot(e.clientX - role.cx, e.clientY - role.cy) <= BLOCKED_DRAG) return;
        this.pointers.set(id, swallowed(role.pointerType));
        this.blocked(role.by);
        return;
      }
      const live = this.live;
      if (role.kind !== "stroke" || !live) return;
      const coalesced = e.getCoalescedEvents?.();
      if (coalesced?.length)
        for (let i = 0; i < coalesced.length; i++) this.queue(live, coalesced[i]);
      else this.queue(live, e);
      if (!this.cancelFrame) this.cancelFrame = this.frames.request(this.paintFrame);
    }
    /** Queues CSS-pixel samples; queue arithmetic runs before conversion to sheet coordinates. */
    queue(live, sample) {
      const { scale } = live;
      const [x, y] = this.toStrokeCss(sample, scale);
      const { queue } = live;
      let at = live.queued;
      queue[at++] = x;
      queue[at++] = y;
      queue[at++] = sample.pressure;
      queue[at++] = sample.timeStamp;
      live.queued = at;
      live.moved = Math.max(live.moved, Math.hypot(x / scale - live.x0, y / scale - live.y0));
      live.x = x / scale;
      live.y = y / scale;
      live.cssX = x;
      live.cssY = y;
      live.pressure = sample.pressure;
      live.t = sample.timeStamp;
    }
    up(e) {
      this.lift(e, false);
    }
    /** The browser took the pointer: a scroll, a system gesture, or a lost capture. */
    cancel(e) {
      this.lift(e, true);
    }
    /**
     * Nothing while the sheet is locked: a seal is cut from the ink as it stands. Undoing an add that
     * made the current layer leaves the layer just below it current, and a delete undone makes the
     * layer it brings back current.
     */
    undo() {
      if (this.settings.locked || this.suspended || this.needsReplay && !this.resume()) return;
      this.endStroke(true);
      const step = this.withRoom(
        "undo",
        () => timeOurWork(INK_WORK.replay, () => this.history.undo())
      )?.[0];
      if (!step) return;
      const { state } = this.history;
      if (step.tool === "add" && step.layer === this.current)
        this.current = (state.layers[step.at - 1] ?? frontOf(state)).id;
      else if (step.tool === "delete") this.current = step.layer;
      this.bump(/* @__PURE__ */ new Set([...this.history.inked, ...changesInk(step) ? [step.layer] : []]));
      this.changed();
    }
    /** An add redone makes its layer current; a delete redone takes the current layer as a delete does. */
    redo() {
      if (this.settings.locked || this.suspended || this.needsReplay && !this.resume()) return;
      this.endStroke(true);
      const before = this.history.state;
      const step = this.withRoom(
        "redo",
        () => timeOurWork(INK_WORK.replay, () => this.history.redo())
      )?.[0];
      if (!step) return;
      if (step.tool === "add") this.current = step.layer;
      else if (step.tool === "delete" && step.layer === this.current)
        this.current = successorOf(before, step.layer);
      this.bump(/* @__PURE__ */ new Set([...this.history.inked, ...changesInk(step) ? [step.layer] : []]));
      this.changed();
    }
    addLayer() {
      if (!this.beginChange()) return;
      const { state } = this.history;
      if (state.layers.length >= MAX_LAYERS) return;
      const layer = state.nextId;
      const at = indexOf(state, this.current) + 1;
      this.history.perform({ tool: "add", layer, at, T: this.settings.sessionMs() });
      this.current = layer;
      this.changed();
    }
    selectLayer(id) {
      if (!this.beginChange()) return;
      if (id === this.current || indexOf(this.history.state, id) < 0) return;
      this.current = id;
      this.changed();
      this.withRoom("flashing the selected layer", () => this.display.flash());
    }
    deleteLayer() {
      if (!this.beginChange()) return;
      const { state } = this.history;
      if (state.layers.length === 1) return;
      const next = successorOf(state, this.current);
      if (!this.withRoom(
        "deleting a layer",
        () => this.history.perform({ tool: "delete", layer: this.current, T: this.settings.sessionMs() })
      ))
        return;
      this.current = next;
      this.changed();
    }
    moveLayer(id, to) {
      if (!this.beginChange()) return;
      const from = indexOf(this.history.state, id);
      if (from < 0 || from === to) return;
      this.history.perform({ tool: "move", layer: id, to, T: this.settings.sessionMs() });
      this.current = id;
      this.changed();
      this.withRoom("flashing the selected layer", () => this.display.flash());
    }
    /** Sets the current layer's ink aside; undo brings it back. */
    clearLayer() {
      if (!this.beginChange() || !this.history.inked.has(this.current)) return;
      if (!this.withRoom(
        "clearing a layer",
        () => this.history.perform({ tool: "clear", layer: this.current, T: this.settings.sessionMs() })
      ))
        return;
      this.bump([this.current]);
      this.changed();
    }
    previewOpacity(opacity) {
      if (!this.beginChange()) return;
      this.withRoom("previewing layer opacity", () => this.display.previewOpacity(opacity));
    }
    setOpacity(opacity) {
      if (!this.beginChange()) return;
      if (opacity === this.currentLayer().opacity) {
        this.withRoom("restoring layer opacity", () => this.display.previewOpacity(null));
        return;
      }
      const T = this.settings.sessionMs();
      this.history.performOpacity({ tool: "opacity", layer: this.current, opacity, T });
      this.changed();
    }
    setLocked(on) {
      this.setFlag("lock", on);
    }
    /** The bottom layer has nothing below it to clip to, so it takes no clip. */
    setClipped(on) {
      this.setFlag("clip", on);
    }
    /** A layer's own canvas and its ink's box there, device px, out to whole pixels and inside the canvas. */
    thumbnail = (id) => {
      const canvas = this.ink.layerCanvas(id);
      const box = this.ink.inkBox(id);
      if (!canvas || !box) return null;
      const { density: d, width, height } = this.ink;
      const x = Math.max(0, Math.floor(box.x * d));
      const y = Math.max(0, Math.floor(box.y * d));
      const right = Math.min(width, Math.ceil((box.x + box.w) * d));
      const bottom = Math.min(height, Math.ceil((box.y + box.h) * d));
      return { canvas, box: { x, y, w: Math.max(0, right - x), h: Math.max(0, bottom - y) } };
    };
    /** Ends a stroke in progress as if the pointer lifted, as time running out does. */
    finishStroke() {
      this.endStroke(false);
    }
    /** The pointer left the paper: a hovering pen's ring goes. */
    leave() {
      this.hideHover();
    }
    /** Every step, oldest first, layer changes included: what the drawing kept on the device holds. */
    get steps() {
      return this.history.steps;
    }
    /** The steps the timelapse plays, from the last time no layer had ink, and the layers then. */
    timelapse() {
      return this.history.timelapse();
    }
    /** A new visible-ink canvas for sealing; a memory failure throws so the saved drawing is retained. */
    composite() {
      const covered = this.suspended;
      try {
        if ((covered || this.needsReplay) && !this.resume()) throw new CanvasUnavailableError();
        return this.withRoom(
          "compositing the sticker",
          () => this.ink.composite(this.history.state),
          true
        )[0];
      } finally {
        if (covered) this.suspend();
      }
    }
    /**
     * The sheet's size in units and its ink's density; null until its area is measured or a kept
     * drawing brings one.
     */
    get frame() {
      return this.sheet;
    }
    /**
     * The sheet's area was measured on screen, in CSS px. A blank sheet's frame follows it, and a
     * drawing kept without a frame takes it as its own. A drawing with marks keeps its frame: the
     * paper only rescales, so nothing clears or replays.
     */
    fit(area, devicePixelRatio) {
      if (this.frameRule === "fixed") return;
      if (this.frameRule === "follows") {
        this.useFrame(frameFor(area, devicePixelRatio));
        return;
      }
      this.frameRule = "fixed";
      this.useFrame(areaFrame(area, devicePixelRatio));
    }
    /** The paper moved or changed size on screen: a stroke in progress places its next samples where it is now. */
    measurePaper() {
      if (this.live) this.origin = this.place();
    }
    /** A fresh sheet: no ink, nothing to undo or redo, its frame following its area again. */
    reset() {
      this.load([], null, null);
    }
    /**
     * A sheet with these steps on it and nothing to redo, as a drawing picked up after a reload has,
     * in the frame it was drawn in, on `current`, or on the front layer when the steps leave no such
     * layer. A drawing kept without a frame has none until the next measure takes its area as its
     * frame, so a save can't keep the last sheet's with it; with no steps, the frame follows the area.
     */
    load(steps, frame, current) {
      this.endStroke(true);
      this.pointers.clear();
      this.taps.clear();
      if (steps.length === 0) this.frameRule = "follows";
      else if (!frame) {
        this.frameRule = "area";
        this.sheet = null;
      } else if (!steps.some(isOp)) this.frameRule = "follows";
      else {
        this.frameRule = "fixed";
        this.sheet = boundedFrame(frame);
        this.history.dropCheckpoints();
        this.ink.setFrame(this.sheet);
      }
      const loaded = this.withRoom("loading the saved drawing", () => {
        timeOurWork(INK_WORK.replay, () => this.history.load(steps, !this.suspended));
        if (!this.suspended) this.display.resize();
      });
      this.needsReplay = this.suspended || !loaded;
      if (!loaded) this.releaseSurfaces();
      const { state } = this.history;
      this.current = current !== null && indexOf(state, current) >= 0 ? current : frontOf(state).id;
      this.versions = /* @__PURE__ */ new Map();
      this.bump(this.history.inked);
      this.changed();
    }
    /** The sheet is going: its canvases and undo checkpoints are freed now rather than when they're collected. */
    dispose() {
      this.endStroke(true);
      this.releaseSurfaces();
    }
    /** Covered by another screen, retain the recording and selection while freeing every canvas. */
    suspend() {
      if (this.suspended) return;
      this.endStroke(false);
      this.hideHover();
      this.pointers.clear();
      this.taps.clear();
      this.suspended = true;
      this.needsReplay = true;
      this.releaseSurfaces();
    }
    /** Returns the recording to canvases, including the redo branch, before accepting input again. */
    resume() {
      this.suspended = false;
      if (!this.needsReplay) return true;
      const restored = this.withRoom("restoring the drawing", () => {
        this.history.invalidate();
        this.display.resize();
        this.display.show(this.history.state, this.current);
      });
      if (!restored) {
        this.releaseSurfaces();
        return false;
      }
      this.needsReplay = false;
      this.bump(this.history.inked);
      this.notify();
      return true;
    }
    releaseSurfaces() {
      this.display.release();
      this.history.dropCheckpoints();
      this.ink.releaseAll();
    }
    /** Every touch is taken as lifted: a finger's stroke stays, and a tap, fill or hint in progress goes. */
    forgetTouches() {
      this.fingersGone = false;
      this.taps.clear();
      if (this.live?.pointerType === "touch") this.endStroke(false);
      for (const [id, role] of this.pointers)
        if (role.pointerType === "touch") this.pointers.delete(id);
    }
    /** The pointers whose roles `which` picks draw, fill and hint nothing more until they lift. */
    swallowWhere(which) {
      for (const [id, role] of this.pointers)
        if (which(role)) this.pointers.set(id, swallowed(role.pointerType));
    }
    /** A fill tap is down. */
    filling() {
      for (const role of this.pointers.values()) if (role.kind === "fill") return true;
      return false;
    }
    /** Sizes the ink to a new frame; sized afresh, it lets go of every canvas, so what was on it goes back on. */
    useFrame(frame) {
      frame = boundedFrame(frame);
      const was = this.sheet;
      if (was?.w === frame.w && was.h === frame.h && was.density === frame.density) return;
      this.sheet = frame;
      if (!this.ink.setFrame(frame)) return;
      if (this.suspended) {
        this.needsReplay = true;
        return;
      }
      this.needsReplay = true;
      if (!this.resume()) return;
    }
    /**
     * Whether a layer change can go ahead: never on a locked sheet. A stroke in progress ends first, as
     * if it lifted, and a fill tap still down is dropped, since its layer may be about to change.
     */
    beginChange() {
      if (this.settings.locked || this.suspended || this.needsReplay && !this.resume())
        return false;
      this.endStroke(false);
      this.swallowWhere((role) => role.kind === "fill");
      return true;
    }
    /** Turns lock or clip on the current layer on or off as one step, when it changes it. */
    setFlag(tool, on) {
      if (!this.beginChange()) return;
      const layer = this.currentLayer();
      if ((tool === "lock" ? layer.locked : layer.clipped) === on) return;
      if (tool === "clip" && indexOf(this.history.state, this.current) === 0) return;
      this.history.perform({ tool, layer: this.current, on, T: this.settings.sessionMs() });
      this.changed();
    }
    currentLayer() {
      const { state } = this.history;
      return state.layers[indexOf(state, this.current)];
    }
    /** At 0% the current layer is hidden, and takes no ink. */
    currentHidden() {
      return isHidden(this.currentLayer());
    }
    /** Raises the hint for what blocked a press. */
    blocked(by) {
      if (by === "paused") this.events.onBlocked();
      else this.events.onBlockedHidden();
    }
    /**
     * Shows the layers on the current one, or on the front one once the sheet has lost it, then tells
     * the screen. Called after anything that changes the layers, the current layer or a layer's ink.
     */
    changed() {
      const { state } = this.history;
      if (indexOf(state, this.current) < 0) this.current = frontOf(state).id;
      if (this.needsReplay && !this.suspended) {
        this.events.onLayers(this.view());
        return;
      }
      this.notify();
      if (!this.suspended)
        this.withRoom("showing the layers", () => this.display.show(state, this.current));
    }
    notify() {
      this.events.onLayers(this.view());
      const { canUndo, canRedo, hasInk } = this.history;
      this.events.onHistory({ canUndo, canRedo, hasInk });
    }
    view() {
      const { state, inked } = this.history;
      const { current, versions } = this;
      return { state, current, inked, currentInked: inked.has(current), versions };
    }
    /** Gives these layers new ink versions, so their chips draw again. */
    bump(ids) {
      const versions = new Map(this.versions);
      for (const id of ids) versions.set(id, ++this.inkChanges);
      this.versions = versions;
    }
    withRoom(op, write, rethrow = false) {
      const what = typeof op === "string" ? op : `a ${opName(op)} on layer ${op.layer}`;
      try {
        return [write()];
      } catch (error) {
        if (!(error instanceof CanvasUnavailableError)) throw error;
        console.warn(`No canvas for ${what}: letting go of undo's checkpoints to make room`, error);
      }
      this.history.dropCheckpoints();
      try {
        return [write()];
      } catch (error) {
        if (!(error instanceof CanvasUnavailableError)) throw error;
        console.error(
          `No canvas for ${what}, even with undo's checkpoints let go: the operation could not finish`,
          error
        );
        this.events.onInkFailed(error);
        if (rethrow) throw error;
        return null;
      }
    }
    /** Where the paper is now, and how many CSS px a unit spans on it. */
    place() {
      const paper = this.locate();
      return {
        left: paper.left,
        top: paper.top,
        scale: paper.width / (this.sheet?.w ?? paper.width)
      };
    }
    toSheet(e) {
      const { left, top, scale } = this.origin;
      return [(e.clientX - left) / scale, (e.clientY - top) / scale];
    }
    /** Rebase current screen input into the stroke's original CSS-pixel scale. */
    toStrokeCss(e, strokeScale) {
      const { left, top, scale } = this.origin;
      const ratio = strokeScale / scale;
      return [(e.clientX - left) * ratio, (e.clientY - top) * ratio];
    }
    /** A palm-sized contact, judged only on a device a pen has drawn on: before that, size rules nothing. */
    palmContact(e) {
      return this.settings.inputMode !== null && isPalm(e.width, e.height);
    }
    /** A hovering pen's ring, while the sheet would take its mark. */
    hover(e) {
      const s = this.settings;
      if (s.locked || s.paused || s.tool === "fill" || this.live || !this.sheet || this.currentHidden()) {
        this.hideHover();
        return;
      }
      const { left, top, scale } = this.place();
      const share = s.tool === "eraser" ? 1 : previewWidth(s.penPressure, this.pressurePen);
      this.hovering = true;
      this.events.onHover({
        x: e.clientX - left,
        y: e.clientY - top,
        diameter: s.size * share * scale
      });
    }
    hideHover() {
      if (!this.hovering) return;
      this.hovering = false;
      this.events.onHover(null);
    }
    lift(e, cancelled) {
      const id = e.pointerId;
      const role = this.pointers.get(id);
      if (!role) return;
      this.pointers.delete(id);
      if (role.pointerType === "touch") {
        let gesture = null;
        if (cancelled) this.taps.cancel(id);
        else gesture = this.taps.up(id, e.timeStamp);
        if (gesture === "undo") this.undo();
        else if (gesture === "redo") this.redo();
      }
      if (role.kind === "blocked") {
        if (!cancelled) this.blocked(role.by);
      } else if (role.kind === "fill") {
        if (!cancelled && Math.hypot(e.clientX - role.cx, e.clientY - role.cy) < FILL_TAP_SLOP)
          this.applyFill(role.x, role.y);
      } else if (role.kind === "stroke" && this.live) {
        const { live } = this;
        if (!cancelled) {
          [live.x, live.y] = this.toSheet(e);
          [live.cssX, live.cssY] = this.toStrokeCss(e, live.scale);
          live.pressure = e.pressure;
        }
        live.t = e.timeStamp;
        this.endStroke(cancelled && live.moved < CANCEL_KEEPS, cancelled ? 0 : e.pressure);
      }
    }
    beginStroke(e, x, y) {
      const s = this.settings;
      if (s.tool === "eraser" && this.ink.layerCanvas(this.current) === null) {
        this.pointers.set(e.pointerId, swallowed(e.pointerType));
        return;
      }
      const cssX = e.clientX - this.origin.left;
      const cssY = e.clientY - this.origin.top;
      let stabilizer;
      try {
        stabilizer = new Stabilizer(
          { x: cssX, y: cssY, pressure: e.pressure, t: e.timeStamp },
          s.smoothing,
          e.pointerType === "pen"
        );
      } catch (error) {
        if (!(error instanceof StabilizationError)) throw error;
        this.stabilizationFailed(error, e.pointerId);
        return;
      }
      this.frameRule = "fixed";
      const builder = new StrokeBuilder({
        tool: s.tool === "eraser" ? "eraser" : "brush",
        layer: this.current,
        color: s.color,
        size: s.size,
        x,
        y,
        t: e.timeStamp,
        T: s.sessionMs(),
        pressure: stabilizer.initial.pressure,
        pointerType: e.pointerType,
        pressureVaries: this.pressurePen,
        response: s.penPressure
      });
      this.pointers.set(e.pointerId, { pointerType: e.pointerType, kind: "stroke" });
      this.live = {
        id: e.pointerId,
        pointerType: e.pointerType,
        builder,
        stabilizer,
        queue: [],
        queued: 0,
        painted: 1,
        t0: e.timeStamp,
        x0: x,
        y0: y,
        moved: 0,
        x,
        y,
        cssX,
        cssY,
        scale: this.origin.scale,
        pressure: e.pressure,
        t: e.timeStamp
      };
      const shown = this.withRoom(
        builder.op,
        () => timeOurWork(INK_WORK.paint, () => {
          this.display.beginStroke(builder.op);
          this.display.paintStroke(0, 1);
        })
      );
      if (!shown) this.endStroke(true);
    }
    /** `time` is the frame's, on the clock pointer samples are stamped with. */
    paintFrame = (_time) => {
      this.cancelFrame = null;
      const live = this.live;
      if (!live) return;
      try {
        timeOurWork(INK_WORK.paint, () => {
          this.feed(live);
          this.paintNew(live);
          this.display.paintTail(live.builder.provisional());
        });
      } catch (error) {
        if (!(error instanceof StabilizationError)) throw error;
        this.stabilizationFailed(error, live.id);
      }
    };
    /** Feeds the queued samples through the stabilizer to the stroke. */
    feed(live) {
      const { queue, queued, stabilizer, builder } = live;
      const { scale } = live;
      for (let i = 0; i < queued; i += 4) {
        const nib = { x: queue[i] / scale, y: queue[i + 1] / scale, t: queue[i + 3] };
        for (const output of stabilizer.add({
          x: queue[i],
          y: queue[i + 1],
          pressure: queue[i + 2],
          t: queue[i + 3]
        })) builder.add(output.x / scale, output.y / scale, output.pressure, output.t, nib);
      }
      live.queued = 0;
    }
    /** Paints the segments the stroke has added since the last paint on the wet canvas. */
    paintNew(live) {
      const { builder } = live;
      if (builder.count > live.painted) {
        this.display.paintStroke(live.painted, builder.count);
        live.painted = builder.count;
      }
    }
    /**
     * Commits the stroke in progress, painting it whole on its layer, or takes it back: the layer
     * never had it, so the wet canvas only clears.
     */
    endStroke(takeBack, releasePressure = 0) {
      const live = this.live;
      if (!live) return;
      this.live = null;
      if (this.pointers.get(live.id)?.kind === "stroke")
        this.pointers.set(live.id, swallowed(live.pointerType));
      this.cancelFrame?.();
      this.cancelFrame = null;
      if (live.builder.pressured) this.pressurePen = true;
      if (takeBack) {
        this.withRoom("clearing the stroke preview", () => this.display.endStroke());
        this.followIfBlank();
        return;
      }
      const { builder } = live;
      try {
        timeOurWork(INK_WORK.paint, () => {
          this.feed(live);
          const { scale } = live;
          for (const output of live.stabilizer.finish({
            x: live.cssX,
            y: live.cssY,
            pressure: releasePressure,
            t: live.t
          })) builder.add(output.x / scale, output.y / scale, output.pressure, output.t, null);
          const last = live.stabilizer.position;
          builder.settle(last.x / scale, last.y / scale);
          builder.taperEnd();
        });
      } catch (error) {
        if (!(error instanceof StabilizationError)) throw error;
        this.stabilizationFailed(error, live.id);
        return;
      }
      if (builder.pressured) this.pressurePen = true;
      const { op } = builder;
      const painted = timeOurWork(INK_WORK.commit, () => {
        const done = this.withRoom(op, () => this.ink.apply(op, this.history.state));
        if (!done) return false;
        this.history.commit(op);
        return true;
      });
      if (painted) this.landed(op);
      else this.followIfBlank();
      this.withRoom("showing the completed stroke", () => {
        this.display.endStroke();
        if (painted) this.display.showCurrent();
      });
    }
    /** Drop only the uncommitted preview and persist the existing drawing-error notice. */
    stabilizationFailed(error, pointerId) {
      this.live = null;
      this.cancelFrame?.();
      this.cancelFrame = null;
      this.pointers.delete(pointerId);
      this.taps.cancel(pointerId);
      const target = this.captureTarget;
      if (target?.hasPointerCapture(pointerId)) {
        try {
          target.releasePointerCapture(pointerId);
        } catch (releaseError) {
          console.error("Could not release pointer capture after stabilization failed", releaseError);
        }
      }
      this.withRoom("clearing the failed stroke preview", () => this.display.endStroke());
      this.followIfBlank();
      console.error("The uncommitted stroke was dropped because stabilization failed", error);
      this.events.onInkFailed(error);
    }
    applyFill(x, y) {
      const op = {
        tool: "fill",
        reference: this.settings.fillReference,
        layer: this.current,
        x,
        y,
        color: this.settings.color,
        gap: FILL_GAP,
        T: this.settings.sessionMs()
      };
      const flooded = timeOurWork(
        INK_WORK.fill,
        () => this.withRoom(op, () => this.ink.flood(op, this.history.state))
      );
      const changed = flooded?.[0];
      if (!changed) return;
      this.frameRule = "fixed";
      timeOurWork(INK_WORK.commit, () => this.history.commit(op));
      this.landed(op);
      this.withRoom("showing the completed fill", () => {
        this.display.showCurrent();
        this.display.inkChanged(changed);
      });
    }
    /** An op landed on its layer: its chip draws again. */
    landed(op) {
      this.bump([op.layer]);
      this.events.onCommit(op);
      this.notify();
    }
    /** A sheet left blank follows its area again, as it did before a stroke fixed its frame. */
    followIfBlank() {
      if (this.history.steps.length === 0) this.frameRule = "follows";
    }
  };

  // apps/frontend/src/ui/releaseCanvas.ts
  var releaseCanvas = (canvas) => {
    canvas.width = 0;
    canvas.height = 0;
  };

  // apps/frontend/src/sticker-creation/canvas/color.ts
  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1, 7), 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }

  // apps/frontend/src/sticker-creation/canvas/context2d.ts
  function context2d(canvas, settings) {
    const ctx = "convertToBlob" in canvas ? canvas.getContext("2d", settings) : canvas.getContext("2d", settings);
    if (!ctx) throw new CanvasUnavailableError();
    return ctx;
  }
  function blankCanvas(width, height, settings) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    try {
      return { canvas, g: context2d(canvas, settings) };
    } catch (error) {
      releaseCanvas(canvas);
      throw error;
    }
  }

  // apps/frontend/src/sticker-creation/canvas/paintStroke.ts
  var TAU = Math.PI * 2;
  var MIN_RADIUS = 0.3;
  function capsule(g, x0, y0, r0, x1, y1, r1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const d = Math.hypot(dx, dy);
    if (d <= Math.abs(r1 - r0) + 1e-3) {
      const [x, y, r] = r0 >= r1 ? [x0, y0, r0] : [x1, y1, r1];
      g.moveTo(x + r, y);
      g.arc(x, y, r, 0, TAU);
      return;
    }
    const a = Math.atan2(dy, dx);
    const phi = Math.acos((r0 - r1) / d);
    g.moveTo(x0 + r0 * Math.cos(a + phi), y0 + r0 * Math.sin(a + phi));
    g.arc(x0, y0, r0, a + phi, a - phi + TAU);
    g.arc(x1, y1, r1, a - phi, a + phi);
    g.closePath();
  }
  var paintedRadius = (pts, i) => Math.max(pts[i * STRIDE + 2] / 2, MIN_RADIUS);
  function paintStroke(g, op, from = 0, to = op.pts.length / STRIDE, brush = "source-over") {
    if (to <= from) return;
    const { pts } = op;
    g.save();
    g.globalCompositeOperation = op.tool === "eraser" ? "destination-out" : brush;
    g.fillStyle = op.tool === "eraser" ? "#000" : op.color;
    g.beginPath();
    let i = from;
    if (i === 0) {
      const r = paintedRadius(pts, 0);
      g.moveTo(pts[0] + r, pts[1]);
      g.arc(pts[0], pts[1], r, 0, TAU);
      i = 1;
    }
    for (; i < to; i++) {
      const j = i * STRIDE;
      capsule(
        g,
        pts[j - STRIDE],
        pts[j - STRIDE + 1],
        paintedRadius(pts, i - 1),
        pts[j],
        pts[j + 1],
        paintedRadius(pts, i)
      );
    }
    g.fill();
    g.restore();
  }

  // apps/frontend/src/sticker-creation/layers/composite.ts
  function compositeLayers(g, state, canvasOf, ids, rect, scratch) {
    const draw = (to, canvas) => to.drawImage(canvas, rect.x, rect.y, rect.w, rect.h, rect.x, rect.y, rect.w, rect.h);
    g.save();
    scratch.save();
    try {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = "source-over";
      scratch.setTransform(1, 0, 0, 1, 0, 0);
      scratch.globalAlpha = 1;
      for (const id of ids) {
        const at = indexOf(state, id);
        if (at < 0) {
          const held = state.layers.map((layer2) => layer2.id).join(", ");
          throw new Error(`Layer ${id} isn't in the layers being composited (${held})`);
        }
        const layer = state.layers[at];
        const canvas = canvasOf(id);
        if (isHidden(layer) || !canvas) continue;
        const base2 = baseOf(state, id);
        if (!base2) {
          g.globalAlpha = layer.opacity / 100;
          draw(g, canvas);
          continue;
        }
        const baseCanvas = canvasOf(base2.id);
        if (isHidden(base2) || !baseCanvas) continue;
        scratch.clearRect(rect.x, rect.y, rect.w, rect.h);
        scratch.globalCompositeOperation = "copy";
        draw(scratch, canvas);
        scratch.globalCompositeOperation = "destination-in";
        draw(scratch, baseCanvas);
        g.globalAlpha = layer.opacity / 100 * (base2.opacity / 100);
        draw(g, scratch.canvas);
      }
    } finally {
      scratch.restore();
      g.restore();
    }
  }

  // apps/frontend/src/sticker-creation/layers/layerInk.ts
  var CANVAS_BYTES_BUDGET = 224e6;
  var DISPLAY_CANVASES = 4;
  var DISPLAY_CANVAS_COST = 2;
  var BYTES_PER_PIXEL = 4;
  var FILL_COST = 24;
  var FILL_NEAR = 160;
  var Hold = class {
    /** The layer's ink, shared while the layer is unchanged since the hold. */
    shared;
    /** The copy made before the layer's next write, shared with every hold made since the write before. */
    copy = null;
    /** Where the layer's ink reached when held, in sheet units. */
    box;
    /** The ink's sizing when held: canvases sized or released since can't take its pixels. */
    sizing;
    released = false;
    constructor(shared, sizing) {
      this.shared = shared;
      this.box = shared?.box ?? null;
      this.sizing = sizing;
    }
  };
  var unionOf = (a, b) => {
    if (!a || !b) return a ?? b;
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
  };
  var inUnits = ({ x, y, w, h }, density) => ({
    x: x / density,
    y: y / density,
    w: w / density,
    h: h / density
  });
  function strokeBox({ pts }) {
    if (pts.length < STRIDE) return null;
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pts.length; i += STRIDE) {
      const r = pts[i + 2] / 2;
      x0 = Math.min(x0, pts[i] - r);
      y0 = Math.min(y0, pts[i + 1] - r);
      x1 = Math.max(x1, pts[i] + r);
      y1 = Math.max(y1, pts[i + 1] + r);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function layerOf(state, id) {
    const at = indexOf(state, id);
    if (at < 0) {
      const held = state.layers.map((layer) => layer.id).join(", ");
      throw new Error(`Layer ${id} isn't among the sheet's layers (${held})`);
    }
    return state.layers[at];
  }
  function grown(scratch, width, height) {
    if (!scratch) return blankCanvas(width, height);
    const { canvas } = scratch;
    if (canvas.width < width || canvas.height < height) {
      canvas.width = Math.max(canvas.width, width);
      canvas.height = Math.max(canvas.height, height);
    }
    return scratch;
  }
  var LayerInk = class {
    dpr = 1;
    sheetWidth = 1;
    sheetHeight = 1;
    /** Counts the times every canvas was let go of: holds made before can't be restored. */
    sizing = 0;
    shown = FIRST_LAYERS;
    inks = /* @__PURE__ */ new Map();
    copies = /* @__PURE__ */ new Set();
    /** What each fill wrote on its layer, at this density. */
    fills = /* @__PURE__ */ new WeakMap();
    /** Where a fill composites what's shown and reads a layer back: a plain canvas, read once a box. */
    reader = null;
    /** Where compositing cuts a clipped layer to its base. */
    clipper = null;
    /** The display shows a clipped current layer through its view. */
    viewShown = false;
    canvasOf = (id) => this.inks.get(id)?.canvas ?? null;
    /** Device px per sheet unit. */
    get density() {
      return this.dpr;
    }
    /** Every sheet canvas's width, device px. */
    get width() {
      return this.sheetWidth;
    }
    /** Every sheet canvas's height, device px. */
    get height() {
      return this.sheetHeight;
    }
    /** The layers last shown. */
    get state() {
      return this.shown;
    }
    get copiesHeld() {
      return this.copies.size;
    }
    /**
     * Sizes the sheet to the frame, which lets go of every canvas, the holds' copies too, since
     * pixels at another size or density can't be restored; says whether it changed. The caller replays.
     */
    setFrame({ w, h, density }) {
      const width = Math.max(1, Math.round(w * density));
      const height = Math.max(1, Math.round(h * density));
      if (width === this.sheetWidth && height === this.sheetHeight && density === this.dpr)
        return false;
      this.releaseAll();
      this.dpr = density;
      this.sheetWidth = width;
      this.sheetHeight = height;
      this.fills = /* @__PURE__ */ new WeakMap();
      return true;
    }
    /** Replays into a replacement canvas; an allocation failure keeps the original canvas intact. */
    rebuild(layer, write) {
      const original = this.inks.get(layer);
      this.inks.delete(layer);
      try {
        write();
      } catch (error) {
        const partial = this.inks.get(layer);
        if (partial) releaseCanvas(partial.canvas);
        this.inks.delete(layer);
        if (original) this.inks.set(layer, original);
        throw error;
      }
      if (original) this.retire(original);
    }
    show(state) {
      this.shown = state;
    }
    apply(step, before) {
      switch (step.tool) {
        case "brush":
        case "eraser":
          this.stroke(step, before);
          return;
        case "fill": {
          const written = this.fills.get(step);
          if (written) this.replay(step.layer, written, layerOf(before, step.layer).locked);
          else this.flood(step, before);
          return;
        }
        case "clear":
        case "delete":
          this.blank(step.layer);
          return;
        case "add":
        case "move":
        case "opacity":
        case "lock":
        case "clip":
          return;
      }
    }
    cost(step) {
      switch (step.tool) {
        case "fill":
          return FILL_COST;
        case "brush":
        case "eraser":
        case "clear":
          return 1;
        default:
          return 0;
      }
    }
    hold(layer) {
      const ink = this.inks.get(layer) ?? null;
      const hold = new Hold(ink, this.sizing);
      ink?.sharers.add(hold);
      return hold;
    }
    restore(layer, hold) {
      if (hold?.released) throw new Error(`Layer ${layer} can't be restored from a released hold`);
      if (hold && hold.sizing !== this.sizing) {
        throw new Error(
          `Layer ${layer} can't be restored from a hold made before the sheet was last resized or released`
        );
      }
      const ink = this.inks.get(layer);
      if (hold?.shared && hold.shared === ink) return;
      const pixels = hold?.copy?.canvas ?? hold?.shared?.canvas;
      if (!hold || !pixels) {
        this.blank(layer);
        return;
      }
      const target = this.writable(layer);
      const { g } = target;
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = "copy";
      g.drawImage(pixels, 0, 0);
      g.restore();
      target.box = hold.box;
    }
    /** Releasing a hold twice does nothing. */
    release(hold) {
      if (hold.released) return;
      hold.released = true;
      hold.shared?.sharers.delete(hold);
      hold.shared = null;
      const { copy: copy2 } = hold;
      hold.copy = null;
      if (!copy2) return;
      copy2.holds--;
      if (copy2.holds === 0 && this.copies.delete(copy2)) releaseCanvas(copy2.canvas);
    }
    copiesFreedBy(holds) {
      const letGo = /* @__PURE__ */ new Map();
      for (const { copy: copy2 } of new Set(holds)) {
        if (copy2 && this.copies.has(copy2)) letGo.set(copy2, (letGo.get(copy2) ?? 0) + 1);
      }
      let freed = 0;
      for (const [copy2, holds2] of letGo) if (holds2 === copy2.holds) freed++;
      return freed;
    }
    copyBudgetFor(inkedLayers) {
      const canvasBytes = this.sheetWidth * this.sheetHeight * BYTES_PER_PIXEL;
      const canvases = Math.floor(CANVAS_BYTES_BUDGET / canvasBytes);
      const shown = DISPLAY_CANVASES + (this.viewShown ? 1 : 0);
      return Math.max(0, canvases - inkedLayers - shown * DISPLAY_CANVAS_COST);
    }
    /** The display shows a clipped current layer through its view, or stops; holds keep fewer copies while it does. */
    countView(shown) {
      this.viewShown = shown;
    }
    /**
     * Fills from the op's point using its recorded reference, writes on its layer alone, and keeps what
     * it wrote for a replay. The box it changed, in device px, or null when nothing changed.
     */
    flood(op, state) {
      const { locked } = layerOf(state, op.layer);
      const d = this.dpr;
      const color = hexToRgb(op.color);
      const ids = state.layers.map((layer) => layer.id);
      const sheetFind = findOnSheet(
        { width: this.sheetWidth, height: this.sheetHeight },
        (box) => {
          if (op.reference === "visible") return this.readShown(state, ids, box);
          const own = this.inks.get(op.layer);
          return own ? this.readLayer(own, box) : new ImageData(box.w, box.h);
        },
        Math.floor(op.x * d),
        Math.floor(op.y * d),
        color,
        op.gap * d,
        Math.round(FILL_NEAR * d)
      );
      if (!sheetFind) return null;
      const { shown, at, found } = sheetFind;
      const ink = this.inks.get(op.layer);
      const pixels = ink ? this.readLayer(ink, at) : new ImageData(at.w, at.h);
      if (!writeFill(pixels, shown, found, color, locked)) return null;
      const written = recordFill(pixels, at, found);
      this.fills.set(op, written);
      this.put(op.layer, pixels, at, found.box, locked);
      return { ...written.box };
    }
    /** Drops only this fill's cached replay data; its layer's pixels remain unchanged. */
    releaseFill(op) {
      this.fills.delete(op);
    }
    /** A new canvas holding every layer `state` shows, for the seal; the caller releases it. */
    composite(state) {
      this.releaseScratch();
      const whole = { x: 0, y: 0, w: this.sheetWidth, h: this.sheetHeight };
      const { canvas, g } = blankCanvas(this.sheetWidth, this.sheetHeight);
      const ids = state.layers.map((layer) => layer.id);
      try {
        this.compositeInto(g, state, ids, whole);
        return canvas;
      } catch (error) {
        releaseCanvas(canvas);
        throw error;
      } finally {
        this.releaseScratch();
      }
    }
    /**
     * Draws the layers `ids` of `state` onto `g` within `rect`, device px, as `compositeLayers` does,
     * cutting each clipped layer to its base on the ink's own scratch. `canvasOf` can stand in for a
     * layer's own canvas, as the display does for a layer under a stroke in progress.
     */
    compositeInto(g, state, ids, rect, canvasOf = this.canvasOf) {
      compositeLayers(g, state, canvasOf, ids, rect, this.clipScratch(state, rect));
    }
    /** A layer's own ink; null while it has none. */
    layerCanvas(id) {
      return this.canvasOf(id);
    }
    /** Where the layer's ops reached, in sheet units; null while it has no ink. */
    inkBox(id) {
      const box = this.inks.get(id)?.box;
      return box ? { ...box } : null;
    }
    /** Lets go of every canvas: the layers', the holds' copies and the scratches. */
    releaseAll() {
      for (const ink of this.inks.values()) releaseCanvas(ink.canvas);
      this.inks.clear();
      for (const copy2 of this.copies) releaseCanvas(copy2.canvas);
      this.copies.clear();
      this.releaseScratch();
      this.fills = /* @__PURE__ */ new WeakMap();
      this.sizing++;
    }
    /** Releases fill and clipping canvases that can grow as large as the whole sheet. */
    releaseScratch() {
      for (const scratch of [this.reader, this.clipper]) if (scratch) releaseCanvas(scratch.canvas);
      this.reader = null;
      this.clipper = null;
    }
    stroke(op, before) {
      const { locked } = layerOf(before, op.layer);
      const inks = op.tool === "brush" && !locked;
      if (!inks && !this.inks.has(op.layer)) return;
      const ink = this.writable(op.layer);
      paintStroke(ink.g, op, 0, op.pts.length / STRIDE, locked ? "source-atop" : "source-over");
      if (inks) ink.box = unionOf(ink.box, strokeBox(op));
    }
    /** Writes a kept fill again on its layer, reading that layer alone. */
    replay(layer, written, locked) {
      const { box } = written;
      const ink = this.inks.get(layer);
      const pixels = ink ? this.readLayer(ink, box) : new ImageData(box.w, box.h);
      replayFill(pixels, box, written);
      this.put(layer, pixels, box, { x: 0, y: 0, w: box.w, h: box.h }, locked);
    }
    /**
     * Puts the `dirty` part of `pixels`, read from `at`, back on the layer, and grows its ink box by it
     * unless the layer is locked: a locked layer's ink reaches no further than it did.
     */
    put(layer, pixels, at, dirty, locked) {
      const ink = this.writable(layer);
      ink.g.putImageData(pixels, at.x, at.y, dirty.x, dirty.y, dirty.w, dirty.h);
      if (locked) return;
      const changed = { x: at.x + dirty.x, y: at.y + dirty.y, w: dirty.w, h: dirty.h };
      ink.box = unionOf(ink.box, inUnits(changed, this.dpr));
    }
    /** What `ids` show within `box`, composited on a GPU canvas and read back once. */
    readShown(state, ids, box) {
      this.reader = grown(this.reader, box.x + box.w, box.y + box.h);
      const { g } = this.reader;
      g.clearRect(box.x, box.y, box.w, box.h);
      this.compositeInto(g, state, ids, box);
      return g.getImageData(box.x, box.y, box.w, box.h);
    }
    /** A layer's own pixels within `box`, read back through the reader so its canvas is never read. */
    readLayer(ink, box) {
      this.reader = grown(this.reader, box.x + box.w, box.y + box.h);
      const { g } = this.reader;
      g.clearRect(box.x, box.y, box.w, box.h);
      g.drawImage(ink.canvas, box.x, box.y, box.w, box.h, box.x, box.y, box.w, box.h);
      return g.getImageData(box.x, box.y, box.w, box.h);
    }
    /** The scratch compositing cuts clipped layers on, grown to `box` only when a layer has a base. */
    clipScratch(state, box) {
      const clips = state.layers.some((layer) => baseOf(state, layer.id) !== null);
      this.clipper = grown(this.clipper, clips ? box.x + box.w : 1, clips ? box.y + box.h : 1);
      return this.clipper.g;
    }
    /** The layer's ink, made if it has none, with every hold sharing it given its copy first. */
    writable(layer) {
      const ink = this.inks.get(layer);
      if (ink) {
        this.detach(ink);
        return ink;
      }
      const { canvas, g } = blankCanvas(this.sheetWidth, this.sheetHeight);
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const made = { canvas, g, sharers: /* @__PURE__ */ new Set(), box: null };
      this.inks.set(layer, made);
      return made;
    }
    /** Gives the holds sharing the ink's canvas one copy of it, before the canvas is written. */
    detach(ink) {
      if (ink.sharers.size === 0) return;
      const { canvas, g } = blankCanvas(this.sheetWidth, this.sheetHeight);
      g.drawImage(ink.canvas, 0, 0);
      const copy2 = { canvas, holds: ink.sharers.size };
      for (const hold of ink.sharers) {
        hold.shared = null;
        hold.copy = copy2;
      }
      ink.sharers.clear();
      this.copies.add(copy2);
    }
    /** Removes the layer, retaining its existing canvas only while undo holds need its pixels. */
    blank(layer) {
      const ink = this.inks.get(layer);
      if (!ink) return;
      this.retire(ink);
      this.inks.delete(layer);
    }
    /** A removed canvas becomes its holds' copy without allocating another full sheet. */
    retire(ink) {
      if (ink.sharers.size === 0) {
        releaseCanvas(ink.canvas);
        return;
      }
      const copy2 = { canvas: ink.canvas, holds: ink.sharers.size };
      for (const hold of ink.sharers) {
        hold.shared = null;
        hold.copy = copy2;
      }
      ink.sharers.clear();
      this.copies.add(copy2);
    }
  };

  // apps/frontend/src/gratitude/heartArt.ts
  var INK = "#1C1824";
  var XMLNS = 'xmlns="http://www.w3.org/2000/svg"';
  var INK_STROKE = `stroke="${INK}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  var HEART_START = [120, 212];
  var HEART_CURVES = [
    [
      [112, 206],
      [22, 150],
      [22, 86]
    ],
    [
      [22, 48],
      [50, 22],
      [82, 22]
    ],
    [
      [100, 22],
      [113, 32],
      [120, 46]
    ],
    [
      [127, 32],
      [140, 22],
      [158, 22]
    ],
    [
      [190, 22],
      [218, 48],
      [218, 86]
    ],
    [
      [218, 150],
      [128, 206],
      [120, 212]
    ]
  ];
  var HEART_D = `M${HEART_START.join(" ")}${HEART_CURVES.map((c) => `C${c.flat().join(" ")}`).join("")}Z`;
  var MINI_D = "M20 35.5C18.6 34.4 3.5 25.2 3.5 14.2C3.5 8.4 7.9 4 13.3 4C16.2 4 18.6 5.4 20 7.8C21.4 5.4 23.8 4 26.7 4C32.1 4 36.5 8.4 36.5 14.2C36.5 25.2 21.4 34.4 20 35.5Z";
  var eyeHeart = (cx, cy) => `<g transform="translate(${cx - 11} ${cy - 11}) scale(.55)"><path d="${MINI_D}" fill="#F0145A" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><ellipse cx="13" cy="13" rx="4" ry="3" fill="#fff" opacity=".9"/></g>`;
  var FACES = `
  <g class="f-hatch">
    <ellipse cx="74" cy="131" rx="16" ry="8.5" fill="#FF1C62" opacity=".42"/>
    <ellipse cx="166" cy="131" rx="16" ry="8.5" fill="#FF1C62" opacity=".42"/>
    <path d="M64 138L70 124M71 139L77 125M78 140L84 126M156 138L162 124M163 139L169 125M170 140L176 126" ${INK_STROKE} stroke-width="2.4" opacity=".9"/>
  </g>
  <g class="f-hatch-full">
    <path d="M57 137L62 126M85 140L90 128M149 137L154 126M177 140L182 128" ${INK_STROKE} stroke-width="2.2" opacity=".85"/>
    <path d="M103 125L107 117M110 126L114 118M117 127L121 119M124 126L128 118M131 125L135 117" ${INK_STROKE} stroke-width="1.8" opacity=".6"/>
  </g>
  <g class="f f-dots">
    <ellipse cx="96" cy="112" rx="6.5" ry="8.5" fill="${INK}"/><ellipse cx="144" cy="112" rx="6.5" ry="8.5" fill="${INK}"/>
    <circle cx="98.6" cy="108.4" r="2.2" fill="#fff"/><circle cx="146.6" cy="108.4" r="2.2" fill="#fff"/>
    <path d="M111 128Q120 136 129 128" ${INK_STROKE} stroke-width="3.6"/>
  </g>
  <g class="f f-shy">
    <ellipse cx="101" cy="114" rx="6" ry="7.6" fill="${INK}"/><ellipse cx="149" cy="114" rx="6" ry="7.6" fill="${INK}"/>
    <circle cx="103.4" cy="110.8" r="2" fill="#fff"/><circle cx="151.4" cy="110.8" r="2" fill="#fff"/>
    <path d="M108 131q3.5-3.6 7 0t7 0t7 0" ${INK_STROKE} stroke-width="3.2"/>
  </g>
  <g class="f f-hearts">
    ${eyeHeart(95, 110)}${eyeHeart(145, 110)}
    <path d="M106 126Q120 146 134 126Z" fill="${INK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
  </g>
  <g class="f f-over">
    <path d="M85 103L100 112L85 121M155 103L140 112L155 121" ${INK_STROKE} stroke-width="4.4"/>
    <ellipse cx="120" cy="134" rx="6.5" ry="8.5" fill="${INK}"/>
  </g>
  <g class="f f-bliss">
    <path d="M86 115Q95 103 104 115M136 115Q145 103 154 115" ${INK_STROKE} stroke-width="3.8"/>
    <path d="M110 128Q120 138 130 128" ${INK_STROKE} stroke-width="3.6"/>
  </g>
  <g class="f f-wide">
    <ellipse cx="95" cy="110" rx="9.5" ry="11.5" fill="${INK}"/><ellipse cx="145" cy="110" rx="9.5" ry="11.5" fill="${INK}"/>
    <circle cx="98.6" cy="105.4" r="3.4" fill="#fff"/><circle cx="92.4" cy="115" r="1.6" fill="#fff"/>
    <circle cx="148.6" cy="105.4" r="3.4" fill="#fff"/><circle cx="142.4" cy="115" r="1.6" fill="#fff"/>
    <ellipse cx="120" cy="133" rx="4.5" ry="5.5" fill="${INK}"/>
  </g>
  <g class="f f-limp">
    <path d="M86 110Q95 120 104 110M136 110Q145 120 154 110" stroke="#4B4453" stroke-linecap="round" fill="none" stroke-width="3.4"/>
    <ellipse cx="120" cy="130" rx="3.6" ry="4.6" fill="#4B4453"/>
  </g>
  <g class="h-nose">
    <path class="h-nose-line" d="M120 121C119.5 128 118.2 134 117.8 141" stroke="#E3002B" stroke-width="3.4" stroke-linecap="round" fill="none"/>
    <path class="h-nose-drop" d="M117.8 141c2.4 3 3.6 5 3.6 6.6a3.6 3.6 0 0 1-7.2 0c0-1.6 1.2-3.6 3.6-6.6z" fill="#E3002B"/>
  </g>
  <g class="h-sweat" transform="translate(205 60) rotate(22)">
    <path d="M0-17C7-7 11-1 11 5A11 11 0 0 1-11 5C-11-1-7-7 0-17Z" fill="#D5F6F8" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M-5 4q0-5 3-8" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none"/>
  </g>`;
  var GLINT_SVG = `<svg ${XMLNS} viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2C21.6 14 26 18.4 38 20C26 21.6 21.6 26 20 38C18.4 26 14 21.6 2 20C14 18.4 18.4 14 20 2Z" fill="#fff" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/></svg>`;
  var PUFF_SVG = `<svg ${XMLNS} viewBox="0 0 44 36" aria-hidden="true"><path d="M11 31C4.6 31 2.4 24.4 6.6 21.4C4.6 15 10.6 10.6 15.8 13.6C17.8 6.8 27.6 6.4 29.8 13C35 11 40.4 15.6 38.2 21C42.4 23.6 39.6 31 33.6 31Z" fill="#fff" stroke="rgba(110,104,120,.55)" stroke-width="2" stroke-linejoin="round"/></svg>`;
  var BEAD_SVG = `<svg ${XMLNS} viewBox="0 0 24 30" aria-hidden="true"><path d="M12 2C17 9 20 13.6 20 18A8 8 0 0 1 4 18C4 13.6 7 9 12 2Z" fill="#D5F6F8" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/></svg>`;
  var SOUL_SVG = `<svg ${XMLNS} viewBox="0 0 74 92" aria-hidden="true">
  <circle cx="37" cy="56" r="30" fill="#fff" opacity=".5"/>
  <ellipse cx="37" cy="13" rx="21" ry="6.5" fill="none" stroke="#FFD93B" stroke-width="4.2"/>
  <ellipse cx="37" cy="13" rx="21" ry="6.5" fill="none" stroke="#fff" stroke-width="1.2" opacity=".9"/>
  <g transform="translate(7 28) scale(1.5)"><path d="${MINI_D}" fill="rgba(255,236,245,.82)" stroke="rgba(255,79,154,.85)" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M13 17.6q2.4-2.8 4.8 0M22.2 17.6q2.4-2.8 4.8 0" stroke="#4B4453" stroke-width="1.2" stroke-linecap="round" fill="none"/></g>
</svg>`;
  var HAZE_WAVE_SVG = `<svg ${XMLNS} viewBox="0 0 390 40" preserveAspectRatio="none" aria-hidden="true" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="2.2" stroke-linecap="round"><path d="M-10 22c26-14 52 14 78 0s52-14 78 0 52 14 78 0 52-14 78 0 52 14 78 0 52-14 78 0"/></svg>`;
  var HAND_SWIPE_SVG = `<svg ${XMLNS} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false"><path d="M220,148v36c0,13.85-1.63,26.52-4.58,35.68a12,12,0,0,1-22.84-7.36c2.14-6.65,3.42-17.24,3.42-28.32V148a8,8,0,0,0-16,0v4a12,12,0,0,1-24,0V132a8,8,0,0,0-16,0v12a12,12,0,0,1-24,0V76a8,8,0,0,0-16,0V184a12,12,0,0,1-22.18,6.34l-18.68-30-.21-.34A8,8,0,0,0,45,167.92L70.27,209.8a12,12,0,0,1-20.56,12.39l-25.31-42-.12-.2A32,32,0,0,1,76,142.83V76a32,32,0,0,1,64,0v25a32,32,0,0,1,36.78,17A32,32,0,0,1,220,148ZM252.48,47.51l-32-32a12,12,0,0,0-17,17L215,44H172a12,12,0,0,0,0,24h43L203.51,79.51a12,12,0,1,0,17,17l32-32A12,12,0,0,0,252.48,47.51Z"/></svg>`;
  var HEART_SVG = `<svg ${XMLNS} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false"><path d="M240,102c0,70-103.79,126.66-108.21,129a8,8,0,0,1-7.58,0C119.79,228.66,16,172,16,102A62.07,62.07,0,0,1,78,40c20.65,0,38.73,8.88,50,23.89C139.27,48.88,157.35,40,178,40A62.07,62.07,0,0,1,240,102Z"/></svg>`;
  var VIBRATE_SVG = `<svg ${XMLNS} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false"><path d="M184,56V200a24,24,0,0,1-24,24H96a24,24,0,0,1-24-24V56A24,24,0,0,1,96,32h64A24,24,0,0,1,184,56Zm24,24a8,8,0,0,0-8,8v80a8,8,0,0,0,16,0V88A8,8,0,0,0,208,80Zm32,16a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V104A8,8,0,0,0,240,96ZM48,80a8,8,0,0,0-8,8v80a8,8,0,0,0,16,0V88A8,8,0,0,0,48,80ZM16,96a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V104A8,8,0,0,0,16,96Z"/></svg>`;
  var DENT_SVG = `<svg ${XMLNS} viewBox="0 0 84 22" aria-hidden="true"><path d="M0 0Q42 30 84 0Z" fill="#C9C4D6"/><path d="M4 0Q42 22 80 0" fill="rgba(28,24,36,.10)"/><path d="M0 0Q42 30 84 0" fill="none" stroke="rgba(28,24,36,.55)" stroke-width="1.6"/><path d="M7 1.5Q42 23 77 1.5" fill="none" stroke="rgba(255,255,255,.95)" stroke-width="1.3"/><path d="M26 12L19 22M58 12L65 22M42 15.5L42 24" stroke="rgba(28,24,36,.16)" stroke-width="1"/></svg>`;
  function svgDataUrl(svg) {
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }

  // apps/frontend/src/sticker-creation/layers/layerFlash.ts
  var FLASH_MS = 280;
  var GLINT_TAIL_MS = 480;
  var SHRINK = 4;
  var MAX_GLINTS = 7;
  var GLINT_GAP = 0.12;
  var GLINT_TRAVEL = 14;
  var EDGE_ALPHA = 48;
  var MAX_EDGE_PICKS = 2048;
  var REDUCED = "(prefers-reduced-motion: reduce)";
  var INK2 = "#1C1824";
  var LIGHT = "#FFFFFF";
  var GLINT_IMAGE = `url("${svgDataUrl(GLINT_SVG)}")`;
  var SAMPLES = [-0.25, 0.25].flatMap((dx) => [-0.25, 0.25].map((dy) => [dx, dy]));
  var AROUND = [-1, 0, 1].flatMap(
    (dx) => [-1, 0, 1].filter((dy) => dx !== 0 || dy !== 0).map((dy) => [dx, dy])
  );
  function sparksOn(image, ox, oy, gap) {
    const { data, width, height } = image;
    const alpha = (x, y) => x < 0 || y < 0 || x >= width || y >= height ? 0 : data[(y * width + x) * 4 + 3];
    const edge = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (alpha(x, y) < EDGE_ALPHA) continue;
        const out = alpha(x - 1, y) < EDGE_ALPHA || alpha(x + 1, y) < EDGE_ALPHA || alpha(x, y - 1) < EDGE_ALPHA || alpha(x, y + 1) < EDGE_ALPHA;
        if (out) edge.push(x, y);
      }
    }
    if (edge.length === 0) return [];
    const step = 2 * Math.ceil(edge.length / 2 / MAX_EDGE_PICKS);
    const xs = [];
    const ys = [];
    for (let i = 0; i < edge.length; i += step) {
      xs.push(edge[i]);
      ys.push(edge[i + 1]);
    }
    let next = 0;
    for (let i = 1; i < xs.length; i++) if (xs[i] + ys[i] < xs[next] + ys[next]) next = i;
    const nearest = new Float64Array(xs.length).fill(Infinity);
    const picked = [];
    while (next >= 0 && picked.length < MAX_GLINTS) {
      picked.push(next);
      const [px, py] = [xs[next], ys[next]];
      next = -1;
      let farthest = gap * gap;
      for (let i = 0; i < xs.length; i++) {
        nearest[i] = Math.min(nearest[i], (xs[i] - px) ** 2 + (ys[i] - py) ** 2);
        if (nearest[i] >= farthest) {
          farthest = nearest[i];
          next = i;
        }
      }
    }
    return picked.map((i) => ({ x: xs[i] + ox, y: ys[i] + oy }));
  }
  function coveredOutline(ink, above, edge, allocate) {
    const made = allocate(ink.width, ink.height);
    const inner = allocate(ink.width, ink.height);
    for (const [dx, dy] of AROUND) {
      made.g.drawImage(ink, dx * edge * 2, dy * edge * 2);
      inner.g.drawImage(ink, dx * edge, dy * edge);
    }
    for (const [part, color] of [
      [made, INK2],
      [inner, LIGHT]
    ]) {
      part.g.globalCompositeOperation = "source-in";
      part.g.fillStyle = color;
      part.g.fillRect(0, 0, ink.width, ink.height);
    }
    const { g } = made;
    g.globalCompositeOperation = "source-over";
    g.drawImage(inner.canvas, 0, 0);
    releaseCanvas(inner.canvas);
    g.globalCompositeOperation = "destination-out";
    g.drawImage(ink, 0, 0);
    g.globalCompositeOperation = "destination-in";
    g.drawImage(above, 0, 0);
    return made;
  }
  function flashLayer(parts) {
    const media = window.matchMedia(REDUCED);
    if (document.hidden) return null;
    const reduced = media.matches;
    const { layer, inked, above } = parts;
    const { width, height } = layer;
    const w = Math.ceil(width / SHRINK);
    const h = Math.ceil(height / SHRINK);
    const x0 = clamp(Math.floor(inked.x / SHRINK) - 1, 0, w);
    const y0 = clamp(Math.floor(inked.y / SHRINK) - 1, 0, h);
    const x1 = clamp(Math.ceil((inked.x + inked.w) / SHRINK) + 1, 0, w);
    const y1 = clamp(Math.ceil((inked.y + inked.h) / SHRINK) + 1, 0, h);
    if (x1 <= x0 || y1 <= y0) return null;
    const canvases = [];
    const animations = [];
    let glints = null;
    let end = 0;
    let ended = false;
    const allocate = (...args) => {
      const made = blankCanvas(...args);
      canvases.push(made.canvas);
      return made;
    };
    const letGo = () => {
      if (ended) return;
      ended = true;
      window.clearTimeout(end);
      media.removeEventListener("change", letGo);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const animation of animations) animation.cancel();
      animations.length = 0;
      glints?.remove();
      glints = null;
      for (const canvas of canvases) {
        canvas.remove();
        releaseCanvas(canvas);
      }
      canvases.length = 0;
    };
    const onVisibility = () => {
      if (document.hidden) letGo();
    };
    try {
      const sampled = allocate(w, h);
      for (const [dx, dy] of SAMPLES) {
        sampled.g.drawImage(layer, 0, 0, width, height, dx, dy, width / SHRINK, height / SHRINK);
      }
      const image = sampled.g.getImageData(x0, y0, x1 - x0, y1 - y0);
      const sparks = sparksOn(image, x0, y0, GLINT_GAP * Math.min(w, h));
      if (sparks.length === 0) {
        letGo();
        return null;
      }
      const shownWidth = parts.sheet.getBoundingClientRect().width;
      const edge = shownWidth > 0 ? width / shownWidth : SHRINK;
      const outline = above.width > 0 && above.height > 0 ? coveredOutline(layer, above, edge, allocate) : null;
      for (let i = 0; i < image.data.length; i += 4) {
        const alpha = image.data[i + 3] / 255;
        const luminance = 0.2126 * image.data[i] + 0.7152 * image.data[i + 1] + 0.0722 * image.data[i + 2];
        const light = luminance * alpha + 255 * (1 - alpha) < 150;
        image.data[i] = light ? 255 : 28;
        image.data[i + 1] = light ? 255 : 24;
        image.data[i + 2] = light ? 255 : 36;
        image.data[i + 3] = 255;
      }
      sampled.g.clearRect(0, 0, w, h);
      sampled.g.putImageData(image, x0, y0);
      const pulse = allocate(width, height);
      pulse.g.drawImage(sampled.canvas, 0, 0, w, h, 0, 0, width, height);
      pulse.g.globalCompositeOperation = "destination-in";
      pulse.g.drawImage(layer, 0, 0);
      releaseCanvas(sampled.canvas);
      const cue = (canvas, host, name) => {
        canvas.className = `ink-canvas layer-flash__${name}`;
        canvas.setAttribute("aria-hidden", "true");
        host.append(canvas);
        if (reduced) canvas.style.opacity = "0.8";
        else
          animations.push(
            canvas.animate(
              [
                { opacity: 0 },
                { opacity: 0.8, offset: 0.2 },
                { opacity: 0.8, offset: 0.6 },
                { opacity: 0 }
              ],
              { duration: FLASH_MS }
            )
          );
      };
      cue(pulse.canvas, parts.current, "pulse");
      if (outline) cue(outline.canvas, parts.sheet, "outline");
      glints = reduced ? null : document.createElement("div");
      if (glints) {
        glints.className = "layer-flash__glints";
        glints.setAttribute("aria-hidden", "true");
        for (const spark of sparks) {
          const glint = document.createElement("span");
          glint.className = "layer-flash__glint";
          glint.style.left = `${(spark.x + 0.5) * SHRINK / width * 100}%`;
          glint.style.top = `${(spark.y + 0.5) * SHRINK / height * 100}%`;
          glint.style.backgroundImage = GLINT_IMAGE;
          glints.append(glint);
          animations.push(
            glint.animate(
              [
                { transform: "translateY(0) scale(0)", opacity: 0, easing: EASE_OUT },
                { transform: "translateY(0) scale(1)", opacity: 1, offset: 0.22 },
                {
                  transform: `translateY(${GLINT_TRAVEL * 0.65}px) scale(0.9)`,
                  opacity: 1,
                  offset: 0.78
                },
                { transform: `translateY(${GLINT_TRAVEL}px) scale(0.65)`, opacity: 0 }
              ],
              { duration: GLINT_TAIL_MS }
            )
          );
        }
        parts.sheet.append(glints);
      }
      end = window.setTimeout(
        () => {
          letGo();
          parts.onEnd();
        },
        reduced ? 300 : GLINT_TAIL_MS
      );
      media.addEventListener("change", letGo);
      document.addEventListener("visibilitychange", onVisibility);
      return { cancel: letGo };
    } catch (error) {
      letGo();
      throw error;
    }
  }

  // apps/frontend/src/sticker-creation/layers/layerDisplay.ts
  var EDGE_PX = 1;
  function asInkCanvas(canvas) {
    canvas.classList.add("ink-canvas");
    canvas.setAttribute("aria-hidden", "true");
    return canvas;
  }
  function ownCanvas() {
    const shown = blankCanvas(0, 0);
    asInkCanvas(shown.canvas);
    return shown;
  }
  function clearAll({ canvas, g }) {
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.restore();
  }
  function takeIn(box, other) {
    if (other.w <= 0 || other.h <= 0) return;
    if (box.w <= 0 || box.h <= 0) {
      box.x = other.x;
      box.y = other.y;
      box.w = other.w;
      box.h = other.h;
      return;
    }
    const right = Math.max(box.x + box.w, other.x + other.w);
    const bottom = Math.max(box.y + box.h, other.y + other.h);
    box.x = Math.min(box.x, other.x);
    box.y = Math.min(box.y, other.y);
    box.w = right - box.x;
    box.h = bottom - box.y;
  }
  function segmentReaches(pts, i, left, top, right, bottom) {
    const a = Math.max(0, i - 1);
    const ra = paintedRadius(pts, a);
    const rb = paintedRadius(pts, i);
    const ax = pts[a * STRIDE];
    const ay = pts[a * STRIDE + 1];
    const bx = pts[i * STRIDE];
    const by = pts[i * STRIDE + 1];
    return Math.min(ax - ra, bx - rb) < right && Math.max(ax + ra, bx + rb) > left && Math.min(ay - ra, by - rb) < bottom && Math.max(ay + ra, by + rb) > top;
  }
  var LayerDisplay = class {
    host;
    ink;
    below;
    above;
    /** The current layer's canvas and wet, or its view, faded as one by the layer's opacity. */
    group;
    wet;
    /** The current layer as shown, cut to its base: sized and mounted only while the group shows it. */
    view;
    state = FIRST_LAYERS;
    current = FIRST_LAYER;
    /** The canvas of the base the view cuts the current layer to; null while the view isn't shown. */
    viewBase = null;
    /** A layer above, clipped to the current one, shows ink: `above` changes with the current layer's ink. */
    clippedAbove = false;
    aboveIds = [];
    /** Where clipping is redrawn next, device px: one box, so a frame makes no garbage. */
    dirty = { x: 0, y: 0, w: 0, h: 0 };
    /** The current layer's canvas, mounted under wet; null while the layer has none. */
    mounted = null;
    stroke = null;
    /** The current layer's flash while it plays. */
    flashing = null;
    /** The tail as a stroke from the last settled point: one op, refilled each frame. */
    tailOp = {
      tool: "brush",
      layer: FIRST_LAYER,
      color: "#000000",
      pts: [],
      T: 0
    };
    /**
     * Each layer's canvas, but wet for the current layer during a stroke: the layers clipped to it
     * are cut to wet then, which holds the layer as shown, over a copy of it.
     */
    shownCanvasOf = (id) => id === this.current && this.stroke ? this.wet.canvas : this.ink.layerCanvas(id);
    constructor(host, ink) {
      this.host = host;
      this.ink = ink;
      this.below = ownCanvas();
      this.wet = ownCanvas();
      this.above = ownCanvas();
      this.view = ownCanvas();
      this.group = document.createElement("div");
      this.group.className = "ink-current";
      this.group.append(this.wet.canvas);
      host.append(this.below.canvas, this.group, this.above.canvas);
      this.resize();
    }
    resize() {
      this.stopFlash();
      this.host.append(this.below.canvas, this.group, this.above.canvas);
      this.group.append(this.wet.canvas);
      const { width, height, density } = this.ink;
      const { canvas, g } = this.wet;
      canvas.width = width;
      canvas.height = height;
      g.setTransform(density, 0, 0, density, 0, 0);
      releaseCanvas(this.below.canvas);
      releaseCanvas(this.above.canvas);
      this.closeView();
    }
    show(state, current) {
      const at = indexOf(state, current);
      if (at < 0) {
        const held = state.layers.map((layer2) => layer2.id).join(", ");
        throw new Error(`Layer ${current} isn't among the sheet's layers (${held})`);
      }
      this.stopFlash();
      this.state = state;
      this.current = current;
      const layer = state.layers[at];
      const base2 = baseOf(state, current);
      const baseCanvas = base2 && !isHidden(base2) ? this.ink.layerCanvas(base2.id) : null;
      const shows = !isHidden(layer) && (!base2 || baseCanvas !== null);
      const above = state.layers.slice(at + 1);
      this.aboveIds = above.map(({ id }) => id);
      this.clippedAbove = shows && above.some((over) => this.showsClippedTo(over, current));
      this.compositeSide(this.below, state.layers.slice(0, at));
      this.compositeSide(this.above, above);
      this.showCurrent();
      if (shows && baseCanvas) this.openView(baseCanvas);
      else this.closeView();
      this.hideCovered();
      this.fade(layer.opacity);
    }
    previewOpacity(opacity) {
      this.stopFlash();
      const at = indexOf(this.state, this.current);
      const next = opacity ?? this.state.layers[at].opacity;
      const base2 = baseOf(this.state, this.current);
      const baseCanvas = base2 && !isHidden(base2) ? this.ink.layerCanvas(base2.id) : null;
      if (next > 0 && baseCanvas && !this.viewBase) this.openView(baseCanvas);
      else if (opacity === null && next === 0) this.closeView();
      this.hideCovered();
      const above = this.state.layers.slice(at + 1);
      if (above.some((layer) => this.showsClippedTo(layer, this.current))) {
        const preview = {
          ...this.state,
          layers: this.state.layers.map(
            (layer) => layer.id === this.current ? { ...layer, opacity: next } : layer
          )
        };
        this.compositeSide(this.above, above, preview);
      }
      this.fade(next);
    }
    showCurrent() {
      const canvas = this.ink.layerCanvas(this.current);
      if (canvas === this.mounted) return;
      this.mounted?.remove();
      this.mounted = canvas;
      if (!canvas) return;
      this.group.insertBefore(asInkCanvas(canvas), this.wet.canvas);
      this.hideCovered();
    }
    inkChanged(box) {
      if (this.clipping) this.redrawClipping(box);
    }
    /** Starts afresh, as if the stroke before it, if any, had ended. */
    beginStroke(op) {
      if (op.layer !== this.current) {
        throw new Error(
          `A stroke on layer ${op.layer} can't start while layer ${this.current} is current`
        );
      }
      this.stopFlash();
      this.endStroke();
      this.showCurrent();
      const { locked } = this.state.layers[indexOf(this.state, op.layer)];
      const copied = op.tool === "eraser" || locked || this.clippedAbove ? this.mounted : null;
      if (copied) {
        const { g } = this.wet;
        g.save();
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalCompositeOperation = "copy";
        g.drawImage(copied, 0, 0);
        g.restore();
      }
      const brush = locked ? "source-atop" : "source-over";
      this.stroke = { op, brush, copied, painted: 0, tail: { x: 0, y: 0, w: 0, h: 0 } };
      if (copied) this.hideCovered();
      this.tailOp.tool = op.tool;
      this.tailOp.layer = op.layer;
      this.tailOp.color = op.color;
    }
    paintStroke(from, to) {
      const stroke = this.live();
      paintStroke(this.wet.g, stroke.op, from, to, stroke.brush);
      stroke.painted = Math.max(stroke.painted, to);
      if (to <= from || !this.clipping) return;
      this.inkedBox(stroke.op.pts, Math.max(0, from - 1), to, this.dirty);
      this.redrawClipping(this.dirty);
    }
    paintTail(pts) {
      const stroke = this.live();
      const clipping = this.clipping;
      if (clipping) {
        this.dirty.w = 0;
        takeIn(this.dirty, stroke.tail);
      }
      if (stroke.tail.w > 0) this.eraseTail(stroke);
      const count = pts.length / STRIDE;
      if (count > 0) {
        const tail = this.tailOp.pts;
        const last = stroke.op.pts.length - STRIDE;
        for (let j = 0; j < STRIDE; j++) tail[j] = stroke.op.pts[last + j];
        for (let j = 0; j < pts.length; j++) tail[STRIDE + j] = pts[j];
        paintStroke(this.wet.g, this.tailOp, 1, count + 1, stroke.brush);
        this.inkedBox(tail, 0, count + 1, stroke.tail);
      }
      if (!clipping) return;
      takeIn(this.dirty, stroke.tail);
      this.redrawClipping(this.dirty);
    }
    endStroke() {
      clearAll(this.wet);
      const stroke = this.stroke;
      this.stroke = null;
      if (!stroke) return;
      if (stroke.copied) this.hideCovered();
      if (!this.clipping) return;
      const { pts } = stroke.op;
      this.inkedBox(pts, 0, pts.length / STRIDE, this.dirty);
      takeIn(this.dirty, stroke.tail);
      this.redrawClipping(this.dirty);
    }
    flash() {
      this.stopFlash();
      const layer = this.state.layers[indexOf(this.state, this.current)];
      const base2 = baseOf(this.state, this.current);
      const canvas = base2 ? this.viewBase ? this.view.canvas : null : this.ink.layerCanvas(this.current);
      const box = this.ink.inkBox(this.current);
      if (this.stroke || !canvas || !box || isHidden(layer)) return;
      const d = this.ink.density;
      this.flashing = flashLayer({
        layer: canvas,
        inked: { x: box.x * d, y: box.y * d, w: box.w * d, h: box.h * d },
        above: this.above.canvas,
        current: this.group,
        sheet: this.host,
        onEnd: () => {
          this.flashing = null;
        }
      });
    }
    release() {
      this.stopFlash();
      this.endStroke();
      this.closeView();
      for (const { canvas } of [this.below, this.wet, this.above]) releaseCanvas(canvas);
      this.mounted?.remove();
      this.mounted = null;
      this.host.replaceChildren();
    }
    /** Fades the current layer's group at its base's opacity when clipped. */
    fade(opacity) {
      const base2 = baseOf(this.state, this.current);
      const baseCanvas = base2 && !isHidden(base2) ? this.ink.layerCanvas(base2.id) : null;
      const baseOpacity = base2 ? base2.opacity / FULL_OPACITY : 1;
      this.group.style.opacity = String(opacity / FULL_OPACITY * baseOpacity);
      this.group.style.visibility = opacity === 0 || base2 && !baseCanvas ? "hidden" : "";
    }
    stopFlash() {
      this.flashing?.cancel();
      this.flashing = null;
    }
    live() {
      if (!this.stroke) throw new Error("The sheet has no stroke in progress to paint");
      return this.stroke;
    }
    /** A change to the current layer's ink shows elsewhere too: in its view, or in the layers above clipped to it. */
    get clipping() {
      return this.viewBase !== null || this.clippedAbove;
    }
    /** Whether `layer` shows ink clipped to layer `base`. */
    showsClippedTo(layer, base2) {
      return !isHidden(layer) && this.ink.layerCanvas(layer.id) !== null && baseOf(this.state, layer.id)?.id === base2;
    }
    /** Composites `layers` onto a side over the whole sheet; a side where none shows ink is let go of. */
    compositeSide(side, layers, state = this.state) {
      const { canvas, g } = side;
      if (!layers.some((layer) => !isHidden(layer) && this.ink.layerCanvas(layer.id))) {
        releaseCanvas(canvas);
        return;
      }
      const { width, height } = this.ink;
      if (canvas.width === width && canvas.height === height) clearAll(side);
      else {
        canvas.width = width;
        canvas.height = height;
      }
      const ids = layers.map((layer) => layer.id);
      this.ink.compositeInto(g, state, ids, { x: 0, y: 0, w: width, h: height });
    }
    /** Redraws what clipping shows of the current layer within `rect`, device px. */
    redrawClipping(rect) {
      if (rect.w <= 0 || rect.h <= 0) return;
      if (this.viewBase) this.cutView(this.viewBase, rect);
      else if (this.clippedAbove) {
        this.above.g.clearRect(rect.x, rect.y, rect.w, rect.h);
        this.ink.compositeInto(this.above.g, this.state, this.aboveIds, rect, this.shownCanvasOf);
      }
    }
    /** Shows the current layer through the view, cut to its base's canvas, over the whole sheet. */
    openView(baseCanvas) {
      this.viewBase = baseCanvas;
      const { canvas } = this.view;
      const { width, height } = this.ink;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      if (canvas.parentElement !== this.group) this.group.append(canvas);
      this.ink.countView(true);
      this.cutView(baseCanvas, { x: 0, y: 0, w: width, h: height });
    }
    /** Lets go of the view, as the group stops showing it. */
    closeView() {
      if (!this.viewBase) return;
      this.viewBase = null;
      releaseCanvas(this.view.canvas);
      this.view.canvas.remove();
      this.ink.countView(false);
    }
    /** Draws the current layer as shown on the view within `rect`, cut to `baseCanvas`. */
    cutView(baseCanvas, { x, y, w, h }) {
      const layer = this.stroke?.copied ? null : this.ink.layerCanvas(this.current);
      const { g } = this.view;
      g.save();
      g.beginPath();
      g.rect(x, y, w, h);
      g.clip();
      g.clearRect(x, y, w, h);
      if (layer) g.drawImage(layer, x, y, w, h, x, y, w, h);
      if (this.stroke) g.drawImage(this.wet.canvas, x, y, w, h, x, y, w, h);
      g.globalCompositeOperation = "destination-in";
      g.drawImage(baseCanvas, x, y, w, h, x, y, w, h);
      g.restore();
    }
    /** Hides what the group shows nothing of: under the view, the layer's canvas and wet; under a copy on wet, the layer's canvas. */
    hideCovered() {
      const viewed = this.viewBase !== null;
      this.wet.canvas.style.visibility = viewed ? "hidden" : "";
      if (this.mounted) this.mounted.style.visibility = viewed || this.stroke?.copied ? "hidden" : "";
    }
    /**
     * Takes the last frame's tail off wet: its box goes back to what was under the stroke, and the
     * settled segments reaching into it are painted again. The clip keeps that repaint inside the
     * box, so the ink outside never doubles its edges.
     */
    eraseTail({ op, brush, copied, painted, tail }) {
      const { g } = this.wet;
      const { x, y, w, h } = tail;
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.beginPath();
      g.rect(x, y, w, h);
      g.clip();
      g.clearRect(x, y, w, h);
      if (copied) g.drawImage(copied, x, y, w, h, x, y, w, h);
      const d = this.ink.density;
      g.setTransform(d, 0, 0, d, 0, 0);
      const left = x / d;
      const top = y / d;
      const right = (x + w) / d;
      const bottom = (y + h) / d;
      let run = -1;
      for (let i = 0; i <= painted; i++) {
        const reaches = i < painted && segmentReaches(op.pts, i, left, top, right, bottom);
        if (reaches && run < 0) run = i;
        else if (!reaches && run >= 0) {
          paintStroke(g, op, run, i, brush);
          run = -1;
        }
      }
      g.restore();
      tail.w = 0;
      tail.h = 0;
    }
    /**
     * Sets `box` to where points [from, to) of `pts` can ink as capsules: device px, out to whole
     * pixels, on the sheet. Empty when none of it is on the sheet.
     */
    inkedBox(pts, from, to, box) {
      let left = Infinity;
      let top = Infinity;
      let right = -Infinity;
      let bottom = -Infinity;
      for (let i = from; i < to; i++) {
        const r = paintedRadius(pts, i);
        const j = i * STRIDE;
        left = Math.min(left, pts[j] - r);
        top = Math.min(top, pts[j + 1] - r);
        right = Math.max(right, pts[j] + r);
        bottom = Math.max(bottom, pts[j + 1] + r);
      }
      const { density: d, width, height } = this.ink;
      box.x = Math.max(0, Math.floor(left * d - EDGE_PX));
      box.y = Math.max(0, Math.floor(top * d - EDGE_PX));
      box.w = Math.min(width, Math.ceil(right * d + EDGE_PX)) - box.x;
      box.h = Math.min(height, Math.ceil(bottom * d + EDGE_PX)) - box.y;
      if (box.w > 0 && box.h > 0) return;
      box.w = 0;
      box.h = 0;
    }
  };

  // docs/research/clip-studio-paint-stabilization/spikes/croquis-replay/pixels.ts
  var base = [
    {
      tool: "brush",
      layer: FIRST_LAYER,
      color: "#db244b",
      T: 0,
      pts: [30, 90, 30, 0, 230, 90, 30, 300]
    },
    {
      tool: "brush",
      layer: FIRST_LAYER,
      color: "#207cbe",
      T: 0,
      pts: [120, 30, 23, 0, 120, 210, 23, 300]
    }
  ];
  function make() {
    const surface = new LayerInk();
    return {
      surface,
      get canvas() {
        const canvas = surface.layerCanvas(FIRST_LAYER);
        if (!canvas) throw new Error("Expected ink on the first layer");
        return canvas;
      }
    };
  }
  var read = (c) => c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  var compare = (a, b) => {
    const aa = read(a), bb = read(b);
    let differentChannels = 0, maxDelta = 0, differentAlpha = 0, maxAlphaDelta = 0;
    for (let i = 0; i < aa.length; i++) {
      if (aa[i] !== bb[i]) differentChannels++;
      maxDelta = Math.max(maxDelta, Math.abs(aa[i] - bb[i]));
      if (i % 4 === 3) {
        if (aa[i] !== bb[i]) differentAlpha++;
        maxAlphaDelta = Math.max(maxAlphaDelta, Math.abs(aa[i] - bb[i]));
      }
    }
    return {
      equal: differentChannels === 0,
      differentChannels,
      maxDelta,
      differentAlpha,
      maxAlphaDelta,
      channels: aa.length
    };
  };
  function runPixels() {
    const results = [];
    const shape = { w: 374, h: 748, density: 1 };
    for (const tool of ["brush", "eraser"]) {
      const live = make(), replay = make();
      const host = document.createElement("div");
      document.body.append(host);
      const display = new LayerDisplay(host, live.surface);
      let commit = null;
      let frame = null;
      const engine = new InkEngine(
        live.surface,
        display,
        {
          tool,
          fillReference: "layer",
          color: "#262020",
          size: 16,
          smoothing: 35,
          locked: false,
          paused: false,
          panelOpen: false,
          inputMode: null,
          penPressure: "normal",
          sessionMs: () => 0
        },
        {
          onHistory() {
          },
          onCommit(op) {
            commit = structuredClone(op);
          },
          onBlocked() {
          },
          onBlockedHidden() {
          },
          onLayers() {
          },
          onInkFailed(error) {
            throw error;
          },
          onPen() {
          },
          onHover() {
          }
        },
        {
          now: () => 360,
          request(cb) {
            frame = cb;
            return () => {
              frame = null;
            };
          }
        }
      );
      engine.fit({ width: 374, height: 748 }, 1);
      replay.surface.setFrame(engine.frame);
      base.forEach((op) => {
        live.surface.apply(op, FIRST_LAYERS);
        replay.surface.apply(op, FIRST_LAYERS);
      });
      const at = (i) => ({
        pointerId: 1,
        pointerType: "pen",
        button: 0,
        buttons: 1,
        clientX: 30 + i * 4,
        clientY: 90 + 30 * Math.sin(i / 8),
        pressure: 0.3 + i * 0.01,
        width: 1,
        height: 1,
        timeStamp: i * 8,
        preventDefault() {
        }
      });
      engine.down(at(0));
      for (let i = 1; i <= 45; i++) {
        engine.move(at(i));
        const cb = frame;
        frame = null;
        cb?.(i * 8);
      }
      engine.up({ ...at(45), pressure: 0, buttons: 0 });
      if (!commit) throw new Error("Missing terminal operation");
      replay.surface.apply(commit, FIRST_LAYERS);
      results.push({
        test: "current_engine_terminal_vs_final_operation_replay",
        tool,
        ...compare(live.canvas, replay.canvas)
      });
      engine.dispose();
      replay.surface.releaseAll();
      host.remove();
    }
    for (const tool of ["brush", "eraser"]) {
      const live = make(), replay = make(), stale = make();
      [live, replay, stale].forEach(({ surface }) => {
        surface.setFrame(shape);
        base.forEach((op) => surface.apply(op, FIRST_LAYERS));
      });
      const before = live.surface.hold(FIRST_LAYER);
      const provisional = {
        tool,
        layer: FIRST_LAYER,
        color: "#28201b",
        T: 0,
        pts: [40, 65, 17, 0, 130, 95, 17, 100, 210, 135, 17, 200]
      };
      const corrected = {
        tool,
        layer: FIRST_LAYER,
        color: "#28201b",
        T: 0,
        pts: [40, 65, 17, 0, 130, 115, 17, 100, 210, 135, 17, 200]
      };
      live.surface.apply(provisional, FIRST_LAYERS);
      stale.surface.apply(provisional, FIRST_LAYERS);
      live.surface.restore(FIRST_LAYER, before);
      live.surface.apply(corrected, FIRST_LAYERS);
      live.surface.release(before);
      replay.surface.apply(corrected, FIRST_LAYERS);
      stale.surface.apply(corrected, FIRST_LAYERS);
      results.push({
        test: "explicit_terminal_replacement_vs_corrected_replay",
        tool,
        ...compare(live.canvas, replay.canvas)
      });
      results.push({
        test: "negative_control_repaint_without_restore",
        tool,
        ...compare(stale.canvas, replay.canvas)
      });
      [live, replay, stale].forEach(({ surface }) => surface.releaseAll());
    }
    return {
      browser: navigator.userAgent,
      results,
      boundary: "Real Canvas2D via current InkEngine/LayerInk/LayerDisplay/paintStroke. Comparison reads committed layer pixels, not display screenshots. Explicit correction remains synthetic; it does not run the separate reconstructed post-correction pipeline. No device input or display timing measured."
    };
  }
  globalThis.runPixels = runPixels;
})();
/*! Bundled license information:

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

use-sync-external-store/cjs/use-sync-external-store-shim.development.js:
  (**
   * @license React
   * use-sync-external-store-shim.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
