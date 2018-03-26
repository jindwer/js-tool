(function(global){
    global.PullToCallback = PullToCallback;

    /**
         * 
         下拉至指定极限值触发指定回调
         *
         @class PullToCallback
         *
         @constructor PullToCallback
         * 
         @param {Object<{}>} obj 实例化下拉组件信息
            elm <Node|String>        元素对象或者选择器
            limit <Number>           下拉临界值，默认60 
            ratio <Number>           滑动斜率，默认1 (y2-y1)/(x2-x1)
            startMsg <String>        开始下拉提示语，默认“下拉刷新”
            releaseMsg <String>      达到临界值的提示语，默认“释放刷新”
            refreshMsg <String>      刷新中的提示语，默认“刷新中...”
            endMsg <String>          刷新结束的提示语，默认“刷新完成”
            beforeTouch <Function>   触摸事件开始时触发
                参数: point <Object>, 包括属性: x <Number> 触点的X坐标，y <Number> 触点的Y坐标
                      instance <Object>，当前实例对象
            touchMove <Function>     在滑动过程中持续触发
                参数：point <Object>, 包括属性: x <Number> 触点的X坐标，y <Number> 触点的Y坐标
                      instance <Object>，当前实例对象
            touchEnd <Function>      滑动过程结束时触发
                参数：point <Object>, 包括属性: x <Number> 触点的X坐标，y <Number> 触点的Y坐标
                     instance <Object>，当前实例对象
            callback <Function>      下拉至临界值触发的回调函数
                参数resolve <Function>，当需要恢复原始位置时调用resolve(),resolve接受两个参数: msg <String>提示信息，wait <Number>停留时间ms
         *
         html对应结构
            <div class="pull-to-request">   
                <div class="pull-to-request-message">提示信息框</div>
                <div class="pull-to-request-data">数据容器框</div>
            </div> 
         *
         调用:
         new PullToCallback({
             elm: '.pull-to-request',
             limit: 60,
             ratio: 1,
             startMsg: '',
             releaseMsg: '',
             refreshMsg: '',
             endMsg: '',
             callback: function(resolve){}
         })
         *
         存在问题：兼容性，包括touch事件的兼容，querySelector的兼容    
                  提示语，现在只支持文字提示语
                  
                  上滑加载更多功能待开发

        */
        function PullToCallback(obj){
            var msgsConstant = {
                startMsg:   '下拉刷新',
                releaseMsg: '释放刷新',
                refreshMsg: '刷新中...',
                endMsg:     '刷新完成'
            };
            var children;
            // 输入的obj中的elm是父级的元素
            this.parentElm  = obj.elm ? 
                            (
                                typeof obj.elm === 'object' ? 
                                ( 
                                    obj.elm.nodeType && obj.elm 
                                ) :
                                document.querySelector(obj.elm)
                            ):
                            document.body;
            // 若未查找到声明的组件则抛出异常并返回                
            if(!this.parentElm){
                throw new Error('You need input an object who includes an attribute "elm", the "elm" may be an element or a selector!');
                return;
            }
            children    = this.parentElm.children, len = children.length; 
            // 数据展示框元素                   
            this.elm    = null;
            // 下拉提示语展示框
            this.msgElm = null;
            // 查找数据展示框 下拉提示语展示框 
            for(var i=0; i<len; i++){
                var tagName = children[i].tagName;
                if(tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'LINK'){
                    continue;
                }else{
                    if(this.elm){
                        this.msgElm = children[i];
                        break;
                    }else{
                        this.elm = children[i];
                    }
                }
            }
            // 若未查找到加载数据的容器则抛出异常并返回
            if(!this.elm){
                throw new Error('You need an element to be container who will includes data to show, like <div class="pull-to-callback-data"></div>');
                return;
            }
            // 若未查找到显示提示语的容器则生成一个div元素
            if(!this.msgElm){
                this.msgElm = document.createElement('div');
                this.msgElm.className = 'pull-to-callback-message';
                this.setStyle.call(this.msgElm, {
                    textAlign: 'center',
                    width: '100%'
                });
                this.parentElm.insertBefore(this.msgElm, this.elm);
            }
            // 下拉距离极限值
            this.limit       = obj.limit || 60;
            // 滑动斜率 (y2-y1)/(x2-x1)
            this.ratio       = obj.ratio || 1;
            // 提示语
            this.msgs        = {
                startMsg:   obj.startMsg   || msgsConstant.startMsg,
                releaseMsg: obj.releaseMsg || msgsConstant.releaseMsg,
                refreshMsg: obj.refreshMsg || msgsConstant.refreshMsg,
                endMsg:     obj.endMsg     || msgsConstant.endMsg
            };
            // 上一次滑动的位置
            this.preLocal    = {
                pageX: 0,
                pageY: 0
            };
            // touchStart时触发
            this.beforeTouch = obj.beforeTouch || null;
            // touchMove时持续触发
            this.touchMove   = obj.touchMove || null;
            // touchEnd时触发
            this.touchEnd    = obj.touchEnd || null;
            // touchStart时触发
            this.beforeTouch = obj.beforeTouch || null;
            // 下拉至极限值时的回调
            this.callback    = obj.callback || null;
            // 执行初始化
            this._init();
        }
        PullToCallback.prototype = {
            constructor: PullToCallback,
            // 设置指定元素的样式
            setStyle: function(style){
                var elm = this instanceof PullToCallback ? this.elm : this;
                var hasOwnProperty = Object.prototype.hasOwnProperty;
                for(var attr in style){
                    hasOwnProperty.call(style, attr) ? (elm.style[attr] = style[attr]) : null;
                }
            },
            // 初始化
            _init(){
                this._initLocal();
                this._initStyle();
                this.elm.addEventListener('touchstart', this._touchStartCb.bind(this));
                this.elm.addEventListener('touchmove', this._touchMoveCb.bind(this));
                this.elm.addEventListener('touchend', this._touchEndCb.bind(this));
            },
            // 初始化位置信息local
            _initLocal(){
                this.local = {
                    moveX: 0,
                    moveY: 0
                }
            },
            // 初始化style
            _initStyle(){
                // 组件容器样式初始化
                this.setStyle.call(this.parentElm, {
                    position: 'relative'
                });
                // 组件提示信息样式初始化
                this.setStyle.call(this.msgElm, {
                    position: 'absolute',
                    zIndex: '1',
                    top: '0',
                    left: '0'
                });
                // 组件数据容器框
                this.setStyle({
                    position: 'absolute',
                    zIndex: '2',
                    transition: 'transform 0s',
                    transform: 'translate(0px, 0px)'
                });
            },
            // 激活的style
            _activeStyle(){
                this.setStyle({
                    transform: 'translate(0px, '+ this.local.moveY +'px)'
                });
            },
            // 释放的style
            _releaseStyle(){
                this.setStyle({
                    transition: 'transform .6s',
                    transform: 'translate(0px, 0px)'
                });
            },
            // callback完成resolve
            _resolveCallback(msg, wait){
                if(this._canCallback()){
                    this.msgElm.innerHTML = msg || this.msgs.endMsg;
                }
                setTimeout(function(){
                    this._releaseStyle();
                }.bind(this), parseInt(wait) || 0);
            },
            // 触摸start回调
            _touchStartCb: function(e){
                var point             = e.touches ? e.touches[0] : e;
                this.beforeTouch && this.beforeTouch({x: point.pageX, y: point.pageY}, this);
                this.preLocal.pageX   = point.pageX;
                this.preLocal.pageY   = point.pageY;
                this.msgElm.innerHTML = this._message('start');
                this._initStyle();
                this._initLocal();
            },
            // 滑动move回调
            _touchMoveCb: function(e){
                var point = e.touches ? e.touches[0] : e;
                if(Math.abs(point.pageY - this.preLocal.pageY)/Math.abs(point.pageX - this.preLocal.pageX) >= this.ratio){
                    this.touchMove && this.touchMove({x: point.pageX, y: point.pageY}, this);
                    this.local.moveX      += point.pageX - this.preLocal.pageX;
                    this.local.moveY      += point.pageY - this.preLocal.pageY;
                    this.local.moveY      = Math.min(this.local.moveY, this.limit);
                    // 上滑限制
                    this.local.moveY      = Math.max(this.local.moveY, -this.limit);
                    this.msgElm.innerHTML = this._message('move');
                    this._activeStyle();
                    this.preLocal.pageX   = point.pageX;
                    this.preLocal.pageY   = point.pageY;
                }
            },
            // 触摸end回调
            _touchEndCb: function(e){
                var direction = this._direction();
                if(direction === 'up' || !this._canCallback()){
                    this._resolveCallback();
                    this.touchEnd && this.touchEnd({x: this.preLocal.pageX, y: this.preLocal.pageY}, this);
                    return;
                }
                if(direction === 'down' && this._canCallback()){
                    this.msgElm.innerHTML = this._message('end');
                    this.touchEnd && this.touchEnd({x: this.preLocal.pageX, y: this.preLocal.pageY}, this);
                    this.callback && this.callback(this._resolveCallback.bind(this));
                }
            },
            // 判断是否到达触发条件
            _canCallback(){
                return this.local.moveY >= this.limit;
            },
            // 判断滑动的方向
            _direction(){
                if(this.local.moveY <= 0){
                    return 'up';
                }else{
                    return 'down';
                }
            },
            // 输出message
            _message(section){
                var direction = this._direction();
                switch(section){
                    case 'start':
                        return this.msgs.startMsg;
                    case 'move': 
                        return direction === 'down' ? 
                               (this.local.moveY >= this.limit ? this.msgs.releaseMsg : this.msgs.startMsg) :
                               '';
                    case 'end':
                        return direction === 'down' ?
                               this.msgs.refreshMsg :
                               ''; 
                    default: 
                        return '';           
                }
            }
        }

})(this);