var MEDIAFIRE = (function($) {
  'use strict';

  function MediaFire(args) {

    if (!(this instanceof MediaFire)) {
      return new MediaFire(args);
    }
    var that = this;
    
    this.app = new MF(args["loginCredentials"].projectKey, args["loginOptions"]);
    this.sessionToken = '';
    this.mediaFireSource;
    this._mediaFireSource = [[],[]];
    this._MFSlength = this._mediaFireSource.length;
    this.emptyFolderMsg = "This folder is empty"
    this.rootFolderName = "My Files";
    this.triggerAjax = false;
    this.ajaxRunning = false;
    this.scrollPosition = 0;
    this.lastchunkObserved = false;
    this.userAvatar="";
    this.currentContentStatus = { 
      content_type: "folders", 
      folderkey: "", 
      chunk: 0, 
      chunk_size: 100, 
      folder_more_chunks: "no", 
      file_more_chunks: "no", 
      fire_flag: true, 
      file_count: 0, 
      folder_count: 0
    };
    this.itemCount = {},
    this.lastChunkCount = 0;

    //DOM Elements
    this.loadingElement = $("#loader");
    this.scrollerList = $("#scroller-list");
    this.emptyFolder = $("#emptyFolderMsg");

    this.login = function() {
      //App Login
      this.app.login({
          email: args["loginCredentials"].username,
          password: args["loginCredentials"].password
        }, function(data) {
          that.setsessionToken(data.response.session_token);
          that.getFolderInfo();
          that.getAvatar();
      });
    };

    this.setsessionToken = function(token){
      this.sessionToken = token;
    }
  }

  MediaFire.prototype.getAvatar = function() {
    var that = this;
    var contentOptions = {
      session_token: this.sessionToken
    };
    this.app.api('user/get_avatar', contentOptions, function(data) {
    		that.userAvatar = data.response.avatar;
    		that.navChange();
    });
  }

  MediaFire.prototype.getFolderInfo = function () {
    var that = this;
    var contentOptions = {
      folder_key: this.currentContentStatus.folderkey,
      session_token: this.sessionToken
    };
    that.showLoader();
    this.app.api('folder/get_info', contentOptions, function(data) {

      that.itemCount = that.currentContentStatus;
      that.totalChunkCount = 0;
      that.itemCount.folder_count = parseInt(data.response.folder_info.folder_count);
      that.itemCount.file_count = parseInt(data.response.folder_info.file_count);
      
      if(that.itemCount.folder_count > 0 || that.itemCount.file_count > 0) {
        that.itemCount.folder_more_chunks = (that.itemCount.folder_count > 0) ? "yes" : "no";
        that.itemCount.file_more_chunks = (that.itemCount.file_count > 0) ? "yes" : "no";

        if(that.itemCount.folder_more_chunks === "yes") {
          that.getContent(0, true);  
        }

        if(that.itemCount.file_more_chunks === "yes") {
          that.getContent(0, true);
        }

      } else {
        that.checkEmptyFolder();
      }
    });
  }

  MediaFire.prototype.callAjax = function(indexer){
    var that = this;
    
    if(this.triggerAjax && !this.ajaxRunning) {
       this.ajaxRunning = true;
       this.getContent(indexer);
    }
  }

  MediaFire.prototype.getContent = function(indexer, getInfo) {
    var that = this;
    var nextChunk = (indexer) ? indexer : 1,
        chunkCount = this.currentContentStatus.chunk + nextChunk;

    this.lastChunkCount=this.currentContentStatus.chunk;

    if(this.currentContentStatus.fire_flag) {

      if((this.currentContentStatus.folder_more_chunks == "yes")) {
        this.currentContentStatus.content_type = "folders";
        this.currentContentStatus.chunk += nextChunk;
        this.getFolderContent({content_type: 'folders', folderkey: this.currentContentStatus.folderkey}, indexer);
      } else {
        that.ajaxRunning = false;
      }

      if((this.currentContentStatus.file_more_chunks == "yes" || indexer === -1) && that.itemCount.folder_count < 100) {
        
        if(this.currentContentStatus.content_type == "folders") {
          this.currentContentStatus.chunk = 0;
        }
        this.currentContentStatus.content_type = "files";
        
        if(chunkCount >= 1) {
          this.currentContentStatus.chunk += nextChunk;
          console.log("current chunk size --------" + this.currentContentStatus.chunk, this.lastChunkCount);
          if(indexer== -1 && this.currentContentStatus.chunk === this.lastChunkCount-1 && !this.lastchunkObserved) {
              this.currentContentStatus.chunk--;
              this.lastchunkObserved = true;
          }
          
          if(!getInfo) {
            this.getFolderContent({content_type: 'files', folderkey: this.currentContentStatus.folderkey}, indexer);
          } else {
            setTimeout(function() {
              that.getFolderContent({content_type: 'files', folderkey: that.currentContentStatus.folderkey}, indexer);  
            }, 1000);
          }
          
        } else {
          that.ajaxRunning = false;  
        }
        console.log("chunk...." + this.currentContentStatus.chunk);

      } else {
        that.ajaxRunning = false;
      }


    } else {
      that.ajaxRunning = false;
    }
  }

  MediaFire.prototype.getFolderContent = function(contentOptionsParam, indexer) {
    var that = this;
    var contentOptions = {
      content_type: contentOptionsParam.content_type,
      folder_key: contentOptionsParam.folderkey,
      session_token: this.sessionToken,
      order_by: 'name',
      order_direction: 'asc',
      chunk: this.currentContentStatus.chunk,
      chunk_size: this.currentContentStatus.chunk_size, 
      details: "no", 
      response_format: "json"
    };
    this.currentContentStatus.fire_flag = false;
    this.showLoader();
    this.app.api('folder/get_content', contentOptions, function(data) {
      that.currentContentStatus.fire_flag = true;

      if(contentOptions.content_type == "files") {
        if(indexer !== -1) {
          that.itemCount.file_count -= data.response.folder_content.files.length; 
        } else {
          that.itemCount.file_count += data.response.folder_content.files.length;
        }
        
        that.currentContentStatus.file_more_chunks = that.hasMoreChunks("file");
        that.constructSourceObject(data, "files", indexer);
      } else {
        if(indexer !== -1) {
          that.itemCount.folder_count -= data.response.folder_content.folders.length;
        } else {
          that.itemCount.folder_count += data.response.folder_content.folders.length;
        }

        that.currentContentStatus.folder_more_chunks = that.hasMoreChunks("folder");
        that.constructSourceObject(data, "folders", indexer);
      }

      that.ajaxRunning = false;
      that.hideLoader();
    });
  }

  MediaFire.prototype.constructSourceObject = function(data, content_type, indexer) {

    var i = 0,
        objArray = [];
      
    var contentObj = (content_type == "files") ? data.response.folder_content.files : data.response.folder_content.folders,
        contentLength = contentObj.length; 

    for(i; i < contentLength ; i++) {
      var obj = {};
      obj.name = (content_type == "files") ? contentObj[i].filename : contentObj[i].name;
      obj.contentkey = contentObj[i].folderkey;
      objArray.push(obj);
    }

    if(contentLength) {
      if(indexer>0 || !indexer){
        this.addLast(objArray);
      } else if(indexer<0) {
        this.addFirst(objArray);
      }
    
      mediaSourceLength = this.mediaFireSource.length;
      setupListCount(Number(data.response.folder_content.chunk_number), Number(data.response.folder_content.chunk_size), indexer);
    }
  }

  MediaFire.prototype.hasMoreChunks = function(contentType) {
    var currentChunk = this.currentContentStatus.chunk * this.currentContentStatus.chunk_size;
    if(contentType == "folder") {
      return (this.currentContentStatus.folder_count > 0) ? "yes" : "no";
    } else {
      return (this.currentContentStatus.file_count > 0) ? "yes" : "no";
    }
  }


  MediaFire.prototype.getFolderDepth = function(contentOptionsParam) {
    var that = this;
    var contentOptions = {
      folder_key: contentOptionsParam.folderkey,
      session_token: this.sessionToken
    };

    this.app.api('folder/get_depth', contentOptions, function(data) {
      var foldername, folderkey;
      if(data.response.folder_depth.depth == 1) {
        foldername = "";
        folderkey = "";
      } else {
        foldername = data.response.folder_depth.chain_folders[1].name;
        folderkey = data.response.folder_depth.chain_folders[1].folderkey;
      }
      that.navigateToFolder(foldername, folderkey);
    });

  }


  MediaFire.prototype.checkEmptyFolder = function() {
    var that = this;
    if(this.currentContentStatus.file_count <= 0 || this.currentContentStatus.folder_count <= 0) { 
      this.emptyFolder.text(this.emptyFolderMsg);
      this.scrollerList.hide();
      this.emptyFolder.show();
    } 
    this.hideLoader(); 
  }

  MediaFire.prototype.navigateToFolder = function(foldername, folderkey) {
    this.scrollerList.css("visibility","hidden");
    this.currentContentStatus.content_type = "folders";
    this.currentContentStatus.folderkey = folderkey;
    this.currentContentStatus.chunk = 0;
    this.mediaFireSource = [];
    this._mediaFireSource = [[],[]];
    this.previousStart = null;
    this.lastchunkObserved = false;
    this.getFolderInfo("newFolder");
    this.navChange(foldername, folderkey);
  }

  MediaFire.prototype.navChange = function(foldername, folderkey) {
    var that = this;
    this.emptyFolder.hide();

    console.log("navChange=" + foldername +  "=" + folderkey);
    var navObj = document.getElementById("navbar");
    
    var navbarTitle = document.getElementById("navbar-title");

    var element = $(navObj);
    element.unbind("click tap");

    if(foldername) {
      navbarTitle.innerHTML = foldername;
      navObj.style.background = "none";
      $(navObj).addClass("back-btn");
	    element.on("click tap", function(e){ e.preventDefault(); that.showLoader(); that.navChangeClick(folderkey); });
    } else {
      navbarTitle.innerHTML = this.rootFolderName;
      $(navObj).removeClass("back-btn");
      navObj.style.background = "url("+this.userAvatar+") no-repeat rgba(204, 204, 204, 0.25) 4px 0px";
    }
  }

  MediaFire.prototype.addLast= function(val) {
    if(val === undefined || val == null || val.constructor !== Array){
      val = [];
    }   
    this._mediaFireSource.push(val);
    this._mediaFireSource.shift();    
    this.mediaFireSource = [].concat(this._mediaFireSource[0],this._mediaFireSource[1]);
  };

  MediaFire.prototype.addFirst= function(val) {
    if(val === undefined || val == null || val.constructor !== Array){
      val = [];
    }
    this._mediaFireSource.unshift(val);
    this._mediaFireSource.pop();     
    this.mediaFireSource = [].concat(this._mediaFireSource[0],this._mediaFireSource[1]);
  };

  MediaFire.prototype.navChangeClick = function(folderkey) {
    console.log("navChangeClick - folderkey=" + folderkey);
    mf.getFolderDepth({folderkey: folderkey});
  }

  MediaFire.prototype.showLoader = function(){
    this.loadingElement.show();
  }

  MediaFire.prototype.hideLoader = function() {
    this.loadingElement.hide();
  }

  return MediaFire;

}(Zepto));

//Mediafire Login parameters
var loginValues={
  loginOptions : {
    apiVersion: 1.2, 
    appKey: '1m68zr28y6tbydbrgqqchsduvsxusur6onrfnd49'
  },
  loginCredentials:{
    projectKey:43931,
    username:'test23606@gmail.com',
    password:'test@23606'
  }
}

var mf = new MEDIAFIRE(loginValues);

var listContainer, listView, gestureAdapter, adapter;
var mediaSourceLength = 0;
var listItem = $('.item');

//Login and Load the page
mf.login();

function ListViewAdapter(count) {
    var adapter = this;

    //lorem = mf.mediaFireSource;

    adapter.getElementsCount = function () {
        return count;
    };

    adapter.getElement = function (index, convertElement, handler) {
      
      //create new element
      try {
        var mfname = mf.mediaFireSource[index].name || mf.mediaFireSource[index].filename,
        mfcontentkey = mf.mediaFireSource[index].contentkey;
      } catch(e){
        var mfname = "",
        mfcontentkey ="";
      }

      
      if (!convertElement) {
          convertElement = document.createElement('div');
          convertElement.className = 'mf-item';

          //setup content
          convertElement.innerHTML = '<h2 class="item-content mc-item mc-folder"><div class="item-info"><i class="item-icon"></i><label class="item-label"></label><i class="item-switch"></i></div></h2>';

          //setup handlers
          handler.info = convertElement.querySelector('.item-info');
          handler.icon = convertElement.querySelector('.item-icon');
          handler.text = convertElement.querySelector('.item-label');
          handler.switchIcon = convertElement.querySelector('.item-switch');
          handler.style = convertElement.style;
      }
      
      if(mfcontentkey) {
          handler.icon.style.backgroundPosition = "0 0";
          handler.switchIcon.style.display = 'none';
          handler.info.setAttribute("name", mfname);
          handler.info.setAttribute("contentkey", mfcontentkey);
      } else {
          handler.icon.style.backgroundPosition = "-50px -250px";
          handler.switchIcon.style.display = 'block';
          handler.info.setAttribute("name", "");
          handler.info.setAttribute("contentkey", "");
      }
      handler.text.textContent = mfname;

      return convertElement;
    };

    return adapter;
}

function initRad() {
    listContainer = document.querySelector('.list-view');
    adapter = new ListViewAdapter(0);
   
    listView = new ScrollBar(new ListView(listContainer, adapter, {
        direction: 'vertical',
        bounds: true,
        stealthCount: 2,
        useOpacity: true,
        requiredFPS: 40,
        itemClass: 'item',
        onScroll: function(position, type, visiblecontentheight){

            var count = adapter.getElementsCount();
            var scrollvalue = Math.abs(Number(position))+visiblecontentheight;
            mf.scrollPosition = Math.abs(Number(position));
            
            if(position < 0) {
                if(scrollvalue >= (count*70) ){
                    mf.triggerAjax = true;
                    mf.callAjax(1);
                }                    
            } else if(position > 0){
                mf.triggerAjax = true;
                mf.callAjax(-1);
            }

        },
        eventListener: {
            type: 'click',
            listener: function (e) {
                //console.log(e);
            },
            useCapture: false
        }
    }), 'scrollbar');
    gestureAdapter = new GestureAdapter(listContainer, listView);
    listContainer.listView = listView;
    listContainer.gestureAdapter = gestureAdapter;    
}


function setupListCount(chunk_num, chunk_size, indexer) {
    var a = mediaSourceLength;

    if(!listView) {
        initRad();
    }
    
    adapter.getElementsCount = function () {
        return a;
    };

    var setPos = listView.setPosition;
    if(a > 100) {
      if(indexer > 0 && chunk_num > 2){
          setPos(-(mf.scrollPosition - (chunk_size*70)));
      } else if(indexer < 0) {
          setPos(-(mf.scrollPosition + (chunk_size*70)));
      }
    }

    listView.refresh();
    //To stop flicker of old contents while changing navigation
    setTimeout(function(){ mf.scrollerList.show(); mf.scrollerList.css("visibility", "visible"); }, 100);
    
}


mf.scrollerList.on("click", ".item-label, .item-icon", function(event) {

  var eventTarget = $(event.target);

  var currentEle = eventTarget.closest("div.item-info"),
      name = $(currentEle).attr("name"),
      key = $(currentEle).attr("contentkey"); 
    
  if(key) { 
      mf.navigateToFolder(name , key) 
  } 

});
