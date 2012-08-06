(function(Raphael, $) {

	Raphael.whiteboard = function(paper, options) {
		return new WhiteBoard(paper, options);
	}

	Raphael.whiteboard.VERSION = '0.0.1';

	var WhiteBoard = function(paper, options) {
		var self = this;
		
		var _options = {
			width: 100,
			height: 100,
			editing: true
		};
		$.extend(_options, options);
		
		var _paper;
		if (paper.raphael && paper.raphael.constructor == Raphael.constructor) {
			_paper = paper;
		} else if (typeof paper == "string") {
			_paper = Raphael(paper, _options.width, _options.height);
		} else {
			throw "first argument must be a Raphael object, an element ID, an array with 3 elements";
		}

		var _canvas = _paper.canvas;

		var _container = $(_canvas).parent();

		var _pen = new Pen();

		var _imageHandler = new ImageHandler();

		var _changeHandlers = [];

		self.paper = function() {
			return _paper;
		}

		self.canvas = function() {
			return _canvas;
		};
		
		self.container = function() {
			return _container;
		};

		self.pen = function(value) {
			if (value === undefined) {
				return _pen;
			}
			_pen = value;
			return self; // function-chaining
		};

		self.editing = function(mode) {
			if (mode === undefined) {
				return _options.editing;
			}
			
			_options.editing = mode;
			if (_options.editing) {
				if(!$.support.touch) {
					// Cursor is crosshair, so it looks like we can do something.
					$(_container).css("cursor", "crosshair");
					$(_container).bind("vmousedown", _mousedown);
					$(_container).bind("vmousemove", _mousemove);
					$(_container).bind("vmouseup", _mouseup);
				} else {
					$(_container).bind("touchstart", _touchstart);
					$(_container).bind("touchmove", _touchmove);
					$(_container).bind("touchend", _touchend);
				}
				// Handle the case when the mouse is released outside the canvas.
				$(document).bind("vmouseup", _mouseup);
			} else {
				// Reverse the settings above.
				if(!$.support.touch) {
					// Cursor is crosshair, so it looks like we can do something.
					$(_container).attr("style", "cursor:default");
					$(_container).unbind("vmousedown", _mousedown);
					$(_container).unbind("vmousemove", _mousemove);
					$(_container).unbind("vmouseup", _mouseup);
				} else {
					$(_container).unbind("touchstart", _touchstart);
					$(_container).unbind("touchmove", _touchmove);
					$(_container).unbind("touchend", _touchend);
				}
				// Handle the case when the mouse is released outside the canvas.
				$(document).unbind("vmouseup", _mouseup);
			}
			
			return self; // function-chaining
		}

		self.addChangeHandler = function(fn) {
			if (typeof fn == "function") {
				_changeHandlers.push(fn);
			}
		}

		self.removeChangeHandler = function(fn) {
			var index = _changeHandlers.indexOf(fn);
			if(index != -1) {
				_changeHandlers.splice(index, 1);
			}
		}

		self.addImage = function(src) {
			var image = whiteboard.paper().image(src, 0, 0, 512, 512);
			_imageHandler.activate(image);
		}

		self.validateImage = function() {
			var attr = _imageHandler.validate();
			_fireChange(attr);
		}

		function _disable_user_select() {
			$("*").css("-webkit-user-select", "none");
			$("*").css("-moz-user-select", "none");
			if ($.browser.msie) {
				$("body").attr("onselectstart", "return false;");
			}
		}
		
		function _enable_user_select() {
			$("*").css("-webkit-user-select", "text");
			$("*").css("-moz-user-select", "text");
			if ($.browser.msie) {
				$("body").removeAttr("onselectstart");
			}
		}

		function _mousedown(e) {
			_disable_user_select();

			_pen.start(e, self);
		};

		function _mousemove(e) {
			_pen.move(e, self);
		};

		function _mouseup(e) {
			_enable_user_select();
			
			var path = _pen.finish(e, self);

			if(path) {
				var attr = path.attr();
				attr.type = "path";
				_fireChange(attr);
			}
		};
		
		function _touchstart(e) {
			e = e.originalEvent;
			e.preventDefault();

			console.log("touchstart ", _imageHandler.isActivated(), e.touches.length, e.srcElement);

			if(!_imageHandler.isActivated()) {
				if (e.touches.length == 1) {
					var touch = e.touches[0];
					_mousedown(touch);
				}
			} else if(e.touches.length == 2 && e.srcElement instanceof SVGImageElement) {
				_imageHandler.start(e, whiteboard);
			}
		}
		
		function _touchmove(e) {
			e = e.originalEvent;
			e.preventDefault();

			if(!_imageHandler.isActivated()) {
				if (e.touches.length == 1) {
					var touch = e.touches[0];
					_mousemove(touch);
				}
			} else if(e.touches.length == 2 && e.srcElement instanceof SVGImageElement) {
				_imageHandler.move(e, whiteboard);
			}
		}
		
		function _touchend(e) {
			e = e.originalEvent;
			e.preventDefault();

			console.log("touchend", e);

			if(!_imageHandler.isActivated()) {
				_mouseup(e);
			} else {
				_imageHandler.finish(e, whiteboard);
			}
		}

		function _fireChange(element) {
			$(_changeHandlers).each(function(index, item) {
				item(element);
			});
		}

		self.editing(_options.editing);
	}

	var Pen = function() {
		var self = this;

		var _color = "#000000";
		var _opacity = 1.0;
		var _width = 5;
		var _offset = null;

		// Drawing state
		var _drawing = false;
		var _c = null;
		var _points = [];

		self.options = function(object) {
			if(object.color) {
				_color = object.color;
			}
			if(object.width) {
				_width = object.width;
			}
		}

		self.start = function(e, whiteboard) {
			_drawing = true;

			console.log("start pen ", _color, _width);

			_offset = $(whiteboard.container()).offset();
			
			var x = e.pageX - _offset.left,
				y = e.pageY - _offset.top;
			_points.push([x, y]);

			_c = whiteboard.paper().path();

			_c.attr({ 
				stroke: _color,
				"stroke-opacity": _opacity,
				"stroke-width": _width,
				"stroke-linecap": "round",
				"stroke-linejoin": "round"
			});
			console.log("pen start");
		};

		self.finish = function(e, whiteboard) {
			var path = null;
			
			if (_c != null) {
				if (_points.length <= 1) {
					_c.remove();
				} else {
					path = _c;
				}
			}
			
			_drawing = false;
			_c = null;
			_points = [];
			
			console.log("pen finish");

			return path;
		};

		self.move = function(e, whiteboard) {
			if (_drawing == true) {
				var x = e.pageX - _offset.left,
					y = e.pageY - _offset.top;			
				_points.push([x, y]);
				_c.attr({ path: points_to_svg() });

				console.log("pen move");
			}
		};

		function points_to_svg() {
			if (_points != null && _points.length > 1) {
				var p = _points[0];
				var path = "M" + p[0] + "," + p[1];
				for (var i = 1, n = _points.length; i < n; i++) {
					p = _points[i];
					path += "L" + p[0] + "," + p[1]; 
				} 
				return path;
			} else {
				return "";
			}
		};
	}

	var ImageHandler = function(image) {
		var self = this;

		var svgImage;
		var points;

		self.isActivated = function() {
			console.log("isActivated", svgImage);
			return svgImage != null;
		}

		self.activate = function(image) {
			console.log("activate", image);
			svgImage = image;
		}

		self.start = function(e, whiteboard) {
			points = _readPoints(e, whiteboard);
			console.log("image handler start", svgImage);
		}

		self.move = function(e, whiteboard) {
			var newPoints = _readPoints(e, whiteboard);

			var slideX1 = newPoints[0] - points[0];
			var slideX2 = newPoints[2] - points[2];
			var slideX = slideX1 > slideX2 ? slideX2 : slideX1;
			var slideY1 = newPoints[1] - points[1];
			var slideY2 = newPoints[3] - points[3];
			var slideY = slideY1 > slideY2 ? slideY2 : slideY1;

			var size = Math.sqrt(Math.pow(points[0] - points[2], 2) + Math.pow(points[1] - points[3], 2));
			var sizeNew = Math.sqrt(Math.pow(newPoints[0] - newPoints[2], 2) + Math.pow(newPoints[1] - newPoints[3], 2));
			var portion = sizeNew / size;

			var attrs = svgImage.attr();
			svgImage.attr({
				x: attrs.x + slideX - (attrs.width * portion - attrs.width) / 2,
				y: attrs.y + slideY - (attrs.height * portion - attrs.height) / 2,
				width: attrs.width * portion,
				height: attrs.height * portion
			});

			points = newPoints;
		}

		self.finish = function(e, whiteboard) {
			if(svgImage) {
				var tmp = svgImage;
				
				points = null;

				console.log("imageHandler finish with", tmp);

				return tmp;
			} else {
				return null;
			}
		}

		self.validate = function() {
			var attr = svgImage.attr();
			attr.type = "image";

			svgImage = null;

			return attr;
		}

		function _readPoints(e, whiteboard) {
			_offset = $(whiteboard.container()).offset();

			var points = [];
			var touch1 = e.touches[0];
			points.push(touch1.pageX - _offset.left);
			points.push(touch1.pageY - _offset.top);
			var touch2 = e.touches[1];
			points.push(touch2.pageX - _offset.left);
			points.push(touch2.pageY - _offset.top);
			return points;
		}
	}

})(window.Raphael, window.jQuery);