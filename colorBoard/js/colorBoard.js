(function(global){
    if(typeof exports === 'object' && typeof module !== 'undefined'){
        module.exports = ColorBoard
    }else if(typeof define === 'function' && define.amd){
        define(function(){
            return ColorBoard;
        })
    }else{
        global.ColorBoard = ColorBoard
    }
    /* 取色器 */
    function ColorBoard(config){
        var el        = config.el,
            fine      = config.fine || {},
            coarse    = config.coarse || {},
            board     = config.board || {},
            fineElm   = _createElement('aside', {
                attrs: { id: 'fine-grain' },
                style: { margin: '10px'}
            }),
            coarseElm = _createElement('aside', {
                attrs: { id: 'coarse-grain' },
                style: { margin: '10px'}
            }),
            boardElm  = _createElement('aside', {
                attrs: { id: 'board' },
                style: { margin: '10px'}
            }),
            colorArr;
        // 当前颜色
        this.currentColor = config.initColor || 'rgb(255, 0, 0)';
        colorArr = this.currentColor.match(/(\d+)/gi);
        this.color = colorArr ? [colorArr[0], colorArr[1], colorArr[2]] : [255, 0, 0];      
        // fine对象
        this.fineGrain = new FineGrain({
            el: fineElm,
            cvsW: fine.width || 200,
            cvsH: fine.height || 200
        });
        //coarse对象
        this.coarseGrain = new CoarseGrain({
            el: coarseElm,
            cvsW: coarse.width || 20,
            cvsH: coarse.height || 200
        });
        //board对象
        this.board = new Board({
            el: boardElm,
            cvsW: board.width || 100,
            cvsH: board.height || 35
        });
        // 容器元素
        this.wrap = _getWrap(el, {
            children: [fineElm, coarseElm, boardElm]
        })
        // 响应
        this.fineGrain.whenColorChange(function(data){
            this.setColor(data.currentColor, true);
        }, this);
        this.coarseGrain.whenColorChange(function(data){
            this.setColor(data.currentColor);
        }, this);
        this.board.whenBoardChange(function(rgb){
            this.setColor(rgb);
        }, this);
        // 设置颜色
        this.setColor = function(rgb, notNeedFine){
            if(typeof rgb == 'string'){
                rgb = rgb.match(/(\d+)/gi);
                rgb = [rgb[0], rgb[1], rgb[2]];
            }
            this.currentColor = 'rgb(' + rgb.join(',') + ')';
            notNeedFine ? null : this.fineGrain.drawByColor(rgb);
            this.board.setColor(rgb);
            config.colorChange && config.colorChange(this.currentColor);
        }
        // 初始化颜色
        this.setColor(this.color);
    }
    /* 细粒度色板对象FineGrain 继承自ColorSelector*/
    function FineGrain(config){
        config.idStr = config.idStr || 'fine';
        ColorSelector.call(this, config);
        //中心颜色
        this.centerColor = [255, 255, 255];
        //调整选择指示器为圆心
        this.selector.style.borderRadius = '50%';
        //依据颜色值绘制画布
        this.drawByColor = function(rgb){
            var cvs         = this.canvas,
                width       = cvs.width,
                height      = cvs.height,
                linearColor = this.cxt.createLinearGradient(0, 0, width, height),
                color       = 'rgb(' + rgb.join(',') + ')';
            this.centerColor= rgb;
            linearColor.addColorStop(0, 'rgb(255, 255, 255)');
            linearColor.addColorStop(0.5, color);
            linearColor.addColorStop(1, 'rgb(0, 0, 0)');
            this.cxt.fillStyle = linearColor;
            this.cxt.fillRect(0, 0, width, height);
            this.moveSelector(width/2, height/2);
        }
        //改变颜色指示器位置
        this.whenColorChange(function(rgb, x, y){
            this.moveSelector(x, y);
        }, this);
        //初始画板
        this.drawByColor([255, 255, 255]);
    }
    FineGrain.prototype = ColorSelector.prototype;
    /* 粗粒度色板对象CoarseGrain 继承自ColorSelector*/
    function CoarseGrain(config){
        config.idStr = config.idStr || 'coarse';
        ColorSelector.call(this, config);
        //调整选择指示器为矩形
        this.selector.style.width = this.canvas.width + 'px';
        //改变颜色指示器位置
        this.whenColorChange(function(rgb, x, y){
            this.moveSelector(this.selectorSize / 2, y);
        }, this);
    }
    CoarseGrain.prototype = ColorSelector.prototype;

    /* 选色控件类ColorSelector */
    function ColorSelector(config){
        var el   = config.el,
            cvsW = config.cvsW || 400,
            cvsH = config.cvsH || 400,
            idStr= config.idStr || new Date().getMilliseconds(),
            //颜色变化订阅者 
            colorObversers = new Subpub();
        //当前的颜色
        this.currentColor = [255, 255, 255];
        //依据容器构建DOM
            //画布
        this.canvas = _createElement('canvas', {
            attrs: {
                width: cvsW,
                height: cvsH,
                id: idStr + '-cvs'
            },
            style: {
                border: '2px solid #ddd',
                cursor: 'pointer'
            },
            events: {
                'mousedown': function(e){
                    colorObversers.publish('colorChange', this, e.offsetX, e.offsetY);
                }.bind(this)
            }
        });
        this.cxt = this.canvas.getContext('2d');
            //选择指示器
        this.selectorSize = 10;
        this.selector = _createElement('div', {
            attrs: {
                id: idStr + '-selector'
            },
            style: {
                width: this.selectorSize + 'px',
                height: this.selectorSize + 'px',
                border: '2px solid #aaa',
                position: 'absolute',
                top: 0,
                left: 0,
                cursor: 'pointer'
            }
        });
            //容器
        this.wrap = _getWrap(el, {
            style: {
                display: 'inline-block',
                position: 'relative',
                verticalAlign: 'top'
            },
            children: [this.canvas, this.selector]
        });
         //添加颜色变化订阅者
         this.whenColorChange = function(handler, context){
            colorObversers.subscribe('colorChange', handler, context)
         }
         //移出订阅
         this.removeColorObverser = function(token){
            colorObversers.unsubscribe(token);
         }
        //初始化
        this._init();
    }
        //移动指示器到指定位置
    ColorSelector.prototype.moveSelector = function(x, y){
        var halfSize = this.selectorSize / 2,
            top      = y - halfSize,
            left     = x - halfSize,
            cvs      = this.canvas,
            limitW   = cvs.width - halfSize,
            limitH   = cvs.height - halfSize;
        top  = top < -halfSize ? -halfSize : top > limitH ? limitH : top;
        left = left < -halfSize ? -halfSize : left > limitW ? limitW : left;
        this.selector.style.top  = top + 'px';
        this.selector.style.left = left + 'px';
        this.currentColor = this.getColorFromPosition(x, y);
    }
        //获得指定位置的颜色
    ColorSelector.prototype.getColorFromPosition = function(x, y){
        var imageData = this.cxt.getImageData(x-1, y-1, 1, 1).data;
        return [imageData[0], imageData[1], imageData[2]];
    }
        //初始化
    ColorSelector.prototype._init = function(){
        var colors = ["rgb(255,0,0)", "rgb(255,255,0)", "rgb(0,255,0)","rgb(0,255,255)", "rgb(0,0,255)", "rgb(255,0,255)"],
            linearColor = this.cxt.createLinearGradient(0, 0, 0, this.canvas.height);
        colors.forEach(function(color, index){
            linearColor.addColorStop(0.16 * index, color);
        });   
        linearColor.addColorStop(1, colors[0]);
        this.cxt.fillStyle = linearColor;
        this.cxt.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /* 数值面板Board */
    function Board(config){
        var el             = config.el,
            cvsW           = config.cvsW || 100,
            cvsH           = config.cvsH || 35,
            idStr          = typeof el == 'string' ? el : new Date().getMilliseconds(),
            boardObversers = new Subpub();
        this.currentValue  = [0, 0, 0];    
        //选色展示区
        this.colorArea = _createElement('div', {
            attrs: {
                id: 'board-show'
            },
            style: {
                width: cvsW + 'px',
                height: cvsH + 'px',
                border: '2px solid #ddd',
                cursor: 'pointer'
            },
            events: {
                //点击复制rgb颜色
                'click': function(){ 
                    var input = _createElement('input', {
                        attrs: {
                            type: 'text',
                            value: 'rgb(' + this.currentValue + ')'
                        },
                        style: {
                            position: 'fixed',
                            top: '-1000px'
                        }
                    });
                    document.body.appendChild(input);
                    input.select();
                    document.execCommand('copy', true, null);  
                    document.body.removeChild(input);  
                    input = null;
                }.bind(this)
            }
        });
        //R
        this.rElm = new InputBox({
            autoVal: 0,
            min: 0,
            max: 255,
            flag: 'r'
        });
        this.rElm.whenValueChange(valueChangeCb, this);
        //G
        this.gElm = new InputBox({
            autoVal: 0,
            min: 0,
            max: 255,
            flag: 'g'
        }); 
        this.gElm.whenValueChange(valueChangeCb, this);
        //B
        this.bElm = new InputBox({
            autoVal: 0,
            min: 0,
            max: 255,
            flag: 'b'
        });
        this.bElm.whenValueChange(valueChangeCb, this);
        //Board容器
        this.boardElm = _getWrap(el, {
            style: {
                display: 'inline-block',
                verticalAlign: 'top'
            },
            children: [this.colorArea, this.rElm.elm, this.gElm.elm, this.bElm.elm]
        });
        //设置颜色
        this.setColor = function(rgb){
            this.currentValue = rgb;
            this.rElm.setValue(rgb[0]);
            this.gElm.setValue(rgb[1]);
            this.bElm.setValue(rgb[2]);
            this.colorArea.style.backgroundColor = 'rgb('+ rgb.join(',') +')';
        }
        //订阅面板变化
        this.whenBoardChange = function(handler, context){
            return boardObversers.subscribe('boardChange', handler, context);
        }
        //数值变化回调
        function valueChangeCb(){
            this.currentValue = [this.rElm.value, this.gElm.value, this.bElm.value];
            this.colorArea.style.backgroundColor = 'rgb('+ this.currentValue.join(',') +')';
            boardObversers.publish('boardChange', this.currentValue);
        }     
    }
    //输入框
    function InputBox(config){
        var autoVal        = Math.ceil(config.autoVal),
            min            = Math.ceil(config.min),
            max            = Math.ceil(config.max),
            flag           = config.flag.toLowerCase(),
            valueObversers = new Subpub(),
            eventTimer;
        autoVal = autoVal < min ? min : autoVal > max ? max : autoVal;
        this.min   = min;
        this.max   = max;
        this.value =  autoVal; 
        //设置值
        this.setValue = function(value){
            this.value = value;
            this.inputElm.value = value;
        };
        //输入框
        this.inputElm = _createElement('input', {
            attrs: {
                value: autoVal,
                id: flag + '-input',
                type: 'number'
            },
            style: {
                outline: 'none',
                border: '2px solid #ddd',
                borderRadius: '5px',
                width: '60px',
                height: '35px',
                textAlign: 'center'
            },
            events: {
                'keyup blur input': function(e){
                    clearTimeout(eventTimer);
                    eventTimer = setTimeout(function(){
                        var target = e.target,
                            value  = target.value;
                        if(!/^\d+$/.test(value)) value = 0;
                        value = parseInt(value, 10);
                        value = value <= min ? min : value >= max ? max : value;
                        target.value = value;
                        valueObversers.publish('valueChange', this.value = value)
                    }.bind(this), 100);
                }.bind(this)
            }
        });
        //label
        this.label = _createElement('label', {
            attrs: {
                id: flag + '-label',
                for: flag + '-input'
            },
            style: {
                fontWeight: 'bold',
                marginRight: '10px'
            },
            children: [flag.toUpperCase()]
        });
        //InputBox
        this.elm = _createElement('div', {
            attrs: {
                id: flag + '-box'
            },
            style: {
                width: '100%',
                margin: '10px auto'
            },
            children: [this.label, this.inputElm]
        });
        //订阅数值变化
        this.whenValueChange = function(handler, context){
            return valueObversers.subscribe('valueChange', handler, context);
        }
            
    }
    /* 工具 */
    //实现订阅发布
    function Subpub(){
        // 订阅者
        var subscribers = {}
        // 订阅
        this.subscribe = function(channel, handler, context){
            var tokenId;
            if(typeof subscribers[channel] == 'undefined'){
                subscribers[channel] = []
            }
            tokenId = channel + '-' + subscribers[channel].length;
            subscribers[channel].push({tId: tokenId, hd: handler, cxt: context})
            return tokenId;
        }
        // 解除订阅
        this.unsubscribe = function(tokenId){
            var channel, id, channelSuber;
            tokenId = tokenId.split('-');
            channel = tokenId[0];
            id      = +tokenId[1];
            if(typeof subscribers[channel] == 'undefined') return
            subscribers[channel].splice(id, 1);
        }
        //发布消息
        this.publish = function(channel){
            var msg = [].slice.call(arguments, 1)
            if(typeof subscribers[channel] == 'undefined') return
            subscribers[channel].forEach(function(subscriber){
                subscriber.hd.apply(subscriber.cxt, msg)
            });
        }
    }
    //获取wrap
    function _getWrap(tag, config){
        var wrapElm = typeof tag == 'string' ? document.querySelector(tag) : tag;
        return _configDom(wrapElm, config);
    }
    //生成Element
    function _createElement(tagName, config){
        var element     = document.createElement(tagName);
        return _configDom(element, config);
    }
    //配置Dom对象
    function _configDom(elm, config){
        var attrs    = config.attrs || {},
            style    = config.style || {},
            children = config.children || [],
            events   = config.events,
            attr,
            fragment; 
        for(attr in attrs) elm.setAttribute(attr, attrs[attr]);
        for(attr in style) elm.style[attr] = style[attr];
        for(attr in events){
            attr.split(' ').forEach(function(type){
                elm.addEventListener(type, events[attr])
            });
        }
        if(children.length){
            fragment = document.createDocumentFragment();
            children.forEach(function(child){
                if(typeof child == 'string'){
                    child = document.createTextNode(child)
                }else if(child === null || child === undefined){
                    return
                }
                fragment.appendChild(child);
            });
            elm.appendChild(fragment);
        }
        return elm;    
    }
})(this);