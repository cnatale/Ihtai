/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	"use strict"

	// @Compiler-Compress "true"
	// @Compiler-Transpile "true"
	// @Compiler-Browserify "true"
	// @Compiler-Output "WebSocketP.min.js"

	const WebSocketPCommunication = __webpack_require__(1)

	class WebSocketP {
	  constructor(Options){
	    let Me = this
	    this.Communication = new WebSocketPCommunication(false)
	    this.Connection = new WebSocket(Options)
	    this.sendCallback = function(message) {
	      Me.Connection.send(JSON.stringify(message))
	    }
	    this.Connection.addEventListener('message', function(Data){
	      try {
	        Data = JSON.parse(Data.data)
	      } catch(err){
	        return Me.emit('ParseError', Data)
	      }
	      Me.Communication.gotMessage(Me.sendCallback, Data)
	    })
	  }
	  on(type, callback) {
	    return this.Communication.on(type, callback)
	  }
	  request(Type, Message){
	    return this.Communication.request(this.sendCallback, Type, Message)
	  }
	  terminate(){
	    this.Connection.close()
	  }
	}
	window.WebSocketP = WebSocketP


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

	var EventEmitter = __webpack_require__(2).Emitter;

	var Communication = (function (_EventEmitter) {
	  _inherits(Communication, _EventEmitter);

	  function Communication(debug) {
	    _classCallCheck(this, Communication);

	    _get(Object.getPrototypeOf(Communication.prototype), 'constructor', this).call(this);
	    this.debug = debug;
	  }

	  _createClass(Communication, [{
	    key: 'gotMessage',
	    value: function gotMessage(sendCallback, message) {
	      if (!message.SB) return;
	      if (this.debug) console.debug(message);

	      if (message.Genre === 'send') {
	        message.Response = null;
	        var response = undefined;
	        try {
	          this.emit(message.Type, message);
	          response = message.Response instanceof Promise ? message.Response : Promise.resolve(message.Response);
	        } catch (err) {
	          response = Promise.reject(err);
	        }
	        response.then(function (retVal) {
	          sendCallback({ Genre: 'response', Status: true, Result: retVal, ID: message.ID, SB: true });
	        }, function (retVal) {
	          if (retVal instanceof Error) {
	            (function () {
	              var error = { __sb_is_error: true };
	              Object.getOwnPropertyNames(retVal).forEach(function (key) {
	                error[key] = retVal[key];
	              });
	              retVal = error;
	            })();
	          }
	          sendCallback({ Genre: 'response', Status: false, Result: retVal, ID: message.ID, SB: true });
	        });
	      } else if (message.Genre === 'response') {
	        if (message.Result && typeof message.Result === 'object' && message.Result.__sb_is_error) {
	          var error = new Error();
	          for (var key in message.Result) {
	            if (key !== '__sb_is_error') error[key] = message.Result[key];
	          }
	          message.Result = error;
	        }
	        this.emit('JOB:' + message.ID, message);
	      }
	    }
	  }, {
	    key: 'request',
	    value: function request(sendCallback, type, message) {
	      var _this = this;

	      return new Promise(function (resolve, reject) {
	        var JobID = Communication.randomId();
	        var disposable = _this.on('JOB:' + JobID, function (Message) {
	          disposable.dispose();
	          if (Message.Status) resolve(Message.Result);else reject(Message.Result);
	        });
	        sendCallback({ Type: type, Genre: 'send', Message: message, SB: true, ID: JobID });
	      });
	    }
	  }], [{
	    key: 'randomId',
	    value: function randomId() {
	      return (Math.random().toString(36) + '00000000000000000').slice(2, 7 + 2);
	    }
	  }]);

	  return Communication;
	})(EventEmitter);

	module.exports = Communication;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = {
	  CompositeDisposable: __webpack_require__(3),
	  Disposable: __webpack_require__(4),
	  Emitter: __webpack_require__(5)
	};

/***/ },
/* 3 */
/***/ function(module, exports) {

	"use strict";

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var CompositeDisposable = (function () {
	  function CompositeDisposable() {
	    _classCallCheck(this, CompositeDisposable);

	    this.disposed = false;
	    this.disposables = new Set(arguments);
	  }

	  _createClass(CompositeDisposable, [{
	    key: "dispose",
	    value: function dispose() {
	      if (this.disposed) return;
	      this.disposed = true;
	      this.disposables.forEach(function (item) {
	        return item.dispose();
	      });
	      this.disposables = null;
	    }
	  }, {
	    key: "add",
	    value: function add() {
	      var _this = this;

	      if (this.disposed) return;
	      Array.prototype.forEach.call(arguments, function (item) {
	        return _this.disposables.add(item);
	      });
	    }
	  }, {
	    key: "remove",
	    value: function remove() {
	      var _this2 = this;

	      if (this.disposed) return;
	      Array.prototype.forEach.call(arguments, function (item) {
	        return _this2.disposables["delete"](item);
	      });
	    }
	  }, {
	    key: "clear",
	    value: function clear() {
	      if (this.disposed) return;
	      this.disposables.clear();
	    }
	  }]);

	  return CompositeDisposable;
	})();

	module.exports = CompositeDisposable;

/***/ },
/* 4 */
/***/ function(module, exports) {

	'use strict';

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var Disposable = (function () {
	  function Disposable(callback) {
	    _classCallCheck(this, Disposable);

	    this.disposed = false;
	    this.callback = callback;
	  }

	  _createClass(Disposable, [{
	    key: 'dispose',
	    value: function dispose() {
	      if (this.disposed) return;
	      if (typeof this.callback === 'function') {
	        this.callback();
	      }
	      this.callback = null;
	      this.disposed = true;
	    }
	  }]);

	  return Disposable;
	})();

	module.exports = Disposable;

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	var Disposable = __webpack_require__(4);

	var Emitter = (function () {
	  function Emitter() {
	    _classCallCheck(this, Emitter);

	    this.disposed = false;
	    this.handlersByEventName = {};
	  }

	  _createClass(Emitter, [{
	    key: 'dispose',
	    value: function dispose() {
	      this.disposed = true;
	      this.handlersByEventName = null;
	    }
	  }, {
	    key: 'on',
	    value: function on(eventName, handler) {
	      var _this = this;

	      if (this.disposed) throw new Error('Emitter has been disposed');
	      if (typeof handler !== 'function') throw new Error('Handler must be a function');
	      if (this.handlersByEventName.hasOwnProperty(eventName)) {
	        this.handlersByEventName[eventName].push(handler);
	      } else {
	        this.handlersByEventName[eventName] = [handler];
	      }
	      return new Disposable(function () {
	        return _this.off(eventName, handler);
	      });
	    }
	  }, {
	    key: 'off',
	    value: function off(eventName, handler) {
	      if (this.disposed || !this.handlersByEventName.hasOwnProperty(eventName)) return;
	      var Index = undefined;
	      if ((Index = this.handlersByEventName[eventName].indexOf(handler)) !== -1) {
	        this.handlersByEventName[eventName].splice(Index, 1);
	      }
	    }
	  }, {
	    key: 'clear',
	    value: function clear() {
	      this.handlersByEventName = {};
	    }
	  }, {
	    key: 'emit',
	    value: function emit(eventName, value) {
	      if (this.disposed || !this.handlersByEventName.hasOwnProperty(eventName)) return;
	      this.handlersByEventName[eventName].forEach(function (callback) {
	        return callback(value);
	      });
	    }
	  }]);

	  return Emitter;
	})();

	module.exports = Emitter;

/***/ }
/******/ ]);