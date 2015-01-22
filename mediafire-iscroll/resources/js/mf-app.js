var MEDIAFIRE = (function($) {
	'use strict';

	var myScroll;
	function MediaFire(args) {
		// enforces new
		if (!(this instanceof MediaFire)) {
			return new MediaFire(args);
		}
		var that = this;
		// constructor body
		
		this.app = new MF(args["loginCredentials"].projectKey, args["loginOptions"]);
		this.sessionToken = '';
		this.itemCount = 0;
		this.mediaFireSource = [];
		this.previousStart;
		this.gStart; 
		this.gCount;
		this.firstRun = true;
    this.triggerAjax = false;
    this.ajaxRunning = false;
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

    this.rootFolderName = "My Files";

    // DOM Elements
    this.loadingElement = $("#loader");
    this.listRows = $("#scroller li.row");

		this.login = function(){
			// Login for Mediafire
			
      this.showLoader();
			//App Login
			
			this.app.login({
			    email: args["loginCredentials"].username,
			    password: args["loginCredentials"].password
			  }, function(data) {
			    that.setsessionToken(data.response.session_token);
			    that.getFolderInfo();
			    //that.loaded();
			});
		};

		this.setsessionToken = function(token){
			this.sessionToken = token;
		}
    this.showLoader();
	}

	MediaFire.prototype.loaded = function() {
		var  that = this;
		myScroll = new IScroll('#wrapper', {
			mouseWheel: true,
			infiniteElements: '#scroller .row',
			dataset: that.requestData,
			dataFiller: that.updateContent,
			cacheSize: 100,
			scrollbars: true,
			reference : that
		});
    /*var wrapperHeight = document.getElementById("wrapper");
    wrapperHeight.style.height = myScroll.wrapperHeight + "px";*/
	}

  MediaFire.prototype.callAjax = function(){
    var that = this;
    if(this.triggerAjax && !this.ajaxRunning){
       this.ajaxRunning = true;
       setTimeout(function(){
        console.log("End of ajax");
        that.ajaxRunning = false;
      },5000);
    }
   
  }

	MediaFire.prototype.requestData = function(start, count) {
		var mfRef = this.options.reference;
		mfRef.gStart = start || 0;
		mfRef.gCount = count || 100;
		//console.log("start=" + start + " -------------- count=" + count);	
		if(mfRef.previousStart != mfRef.gStart) {
			mfRef.previousStart = mfRef.gStart;
			mfRef.getFromLocalSource(mfRef.gStart, mfRef.gCount); 		
		}
	}

	MediaFire.prototype.getFolderInfo = function (type) {
		var that = this;
		var contentOptions = {
			folder_key: this.currentContentStatus.folderkey,
			session_token: this.sessionToken
		};

		this.app.api('folder/get_info', contentOptions, function(data) {

			//myScroll.maxScrollY = (myScroll.wrapperHeight) - ((parseInt(data.response.folder_info.folder_count) + parseInt(data.response.folder_info.file_count)) * myScroll.infiniteElementHeight);
			var contentStat = that.currentContentStatus;

			contentStat.folder_count = parseInt(data.response.folder_info.folder_count);
			contentStat.file_count = parseInt(data.response.folder_info.file_count);
    	if(contentStat.folder_count > 0 || contentStat.file_count > 0) {
			  contentStat.folder_more_chunks = (contentStat.folder_count > 0) ? "yes" : "no";
			  contentStat.file_more_chunks = (contentStat.file_count > 0) ? "yes" : "no";
          if(!myScroll) {
            that.loaded();
          } else {
            myScroll.destroy();
            myScroll = null;
           
            that.itemCount = 0;
            that.loaded();
          }
      } else {
			  that.checkEmptyFolder();
			}

      myScroll.options.infiniteLimit = (parseInt(data.response.folder_info.folder_count) + parseInt(data.response.folder_info.file_count));
      console.log(myScroll.options.infiniteLimit);
      myScroll.refresh();
		});
	}

	MediaFire.prototype.getContent = function() {
    var that = this;
		if(this.currentContentStatus.fire_flag) {

			if(this.currentContentStatus.folder_more_chunks == "yes") {
			  //console.log("Folder More Chunks --> " + this.currentContentStatus.folder_more_chunks);

			  this.currentContentStatus.content_type = "folders";
			  this.currentContentStatus.chunk += 1;
			  this.getFolderContent({content_type: 'folders', folderkey: this.currentContentStatus.folderkey});
			} else if(this.currentContentStatus.file_more_chunks == "yes") {
			  //console.log("File More Chunks --> " + this.currentContentStatus.file_more_chunks);

			  if(this.currentContentStatus.content_type == "folders") {
			    this.currentContentStatus.chunk = 0;
			  }
			  this.currentContentStatus.content_type = "files";
			  this.currentContentStatus.chunk = this.currentContentStatus.chunk + 1;
			  this.getFolderContent({content_type: 'files', folderkey: this.currentContentStatus.folderkey});
			}
		} else {
		  //setTimeout(that.getcontent(), 1000);
		}
	}

	MediaFire.prototype.getFolderContent = function(contentOptionsParam) {
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

			  that.currentContentStatus.file_more_chunks = that.hasMoreChunks("file");
			  that.constructSourceObject(data, "files");

			} else {   

			  that.currentContentStatus.folder_more_chunks = that.hasMoreChunks("folder");
			  that.constructSourceObject(data, "folders");

			}

      that.hideLoader();
      that.triggerAjax = true;
		});
	}

  MediaFire.prototype.showLoader = function(){
    this.loadingElement.show();
  }
  MediaFire.prototype.hideLoader = function() {
    this.loadingElement.hide();
  }

	MediaFire.prototype.constructSourceObject = function(data, content_type) {

		var objArray = [];
		  
		var contentObj = (content_type == "files") ? data.response.folder_content.files : data.response.folder_content.folders;
		var contentLength = contentObj.length; 

		for(var i = 0; i < contentLength ; i++) {
			var obj = {};
			obj.name = (content_type == "files") ? contentObj[i].filename : contentObj[i].name;
			obj.contentkey = contentObj[i].folderkey;
			objArray.push(obj);
		}

		if(contentLength) {
		//myScroll.updateCache(itemCount, JSON.parse(JSON.stringify(objArray)));
		this.mediaFireSource = this.mediaFireSource.concat( objArray );
		this.getFromLocalSource( this.gStart, this.gCount );
    //this.setSource( this.mediaFireSource.slice(this.gStart, this.gCount + count) );
		this.itemCount += this.itemCount + contentLength;
		}
	}

	MediaFire.prototype.hasMoreChunks = function(contentType) {
		var currentChunk = this.currentContentStatus.chunk * this.currentContentStatus.chunk_size;
		if(contentType == "folder") {
		//console.log("--------------------- Checking for more Folders Available ------------------------------");
			return (this.currentContentStatus.folder_count > currentChunk) ? "yes" : "no";
		} else {
		//console.log("--------------------- Checking for more Files Available ------------------------------");
			return (this.currentContentStatus.file_count > currentChunk) ? "yes" : "no";
		}
	}

	MediaFire.prototype.getFromLocalSource = function(start, count) {
		console.log("getFromLocalSource - start=" + start + " -------------- count=" + count);
		if( (this.mediaFireSource.length - count) + 1 > start ) {
			this.setSource( this.mediaFireSource.slice(start, start + count) );
			/*if(this.mediaFireSource.length - (start + count) < 100 ) {
				getContent();
			}*/
		} else if( this.mediaFireSource.length > start && (this.currentContentStatus.folder_more_chunks == "no") && (this.currentContentStatus.file_more_chunks == "no") ) {
			this.setSource( this.mediaFireSource.slice(start, start + count) );
		} else {
			this.getContent();
		}
	}

	MediaFire.prototype.setSource = function( data ) {
		//console.log("------------- setSource=" + data.length + " gStart=" + gStart);
    var that = this;
    this.listRows.css("visibility","visible");
		myScroll.updateCache(this.gStart, JSON.parse(JSON.stringify(data)));
    setTimeout(function(){
      that.loadingElement.hide();
    }, 1000);
	}

	MediaFire.prototype.getFolderDepth = function(contentOptionsParam) {
		var that = this;
		var contentOptions = {
			folder_key: contentOptionsParam.folderkey,
			session_token: this.sessionToken
		};

		this.app.api('folder/get_depth', contentOptions, function(data) {
			//console.log("--------------------------------------------------------getFolderDepth");
			//console.log(data);
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

  MediaFire.prototype.handleClick = function(){

    $("#scroller-list").on("click tap", function(event) {
      var currentEle = $(event.target).closest("li"),
          name = $(currentEle).data("name"),
          key = $(currentEle).data("contentkey"); 
          if(key) { 
            mf.navigateToFolder(name , key) 
          } 
    });

  }	

  MediaFire.prototype.updateContent = function(el, data) {
    var that = this;

    if(data){
      var element = $(el);
      var contents = el.children[0].children[0];
      var toggleIcon = $(contents.children[2]);
      el.style.visibility = "loading";
      contents.children[1].innerHTML = data.name;


      if(data.contentkey) {
          contents.children[0].style.backgroundPosition = "0px 0px";
          contents.children[2].style.display = "none";
          el.children[1].style.visibility = "hidden";
          element.data("name",data.name);
          element.data("contentkey",data.contentkey);
      } else {
        contents.children[0].style.backgroundPosition = "-50px -250px";
        contents.children[2].style.display = "inline-block";
        el.children[1].style.visibility = "visible";
        element.data("name",el._phase);
        element.data("contentkey","");
      }
    } else {
      el.style.visibility = "hidden";
    } 
  }

	MediaFire.prototype.checkEmptyFolder = function() {
		if(this.currentContentStatus.file_count > 0 || this.currentContentStatus.folder_count > 0) {
			document.getElementById("emptyFolderMsg").innerHTML = "";
		} else {
			document.getElementById("emptyFolderMsg").innerHTML = emptyFolderMsg;
		}
	}

	MediaFire.prototype.navigateToFolder = function(foldername, folderkey) {
		this.currentContentStatus.content_type = "folders";
		this.currentContentStatus.folderkey = folderkey;
		this.currentContentStatus.chunk = 0;
		this.mediaFireSource = [];
		this.previousStart = null;
		this.getFolderInfo("newFolder");
		this.navChange(foldername, folderkey);
	}

	MediaFire.prototype.navChange = function(foldername, folderkey) {
		console.log("navChange=" + foldername +  "=" + folderkey);
		var navObj = document.getElementById("navbar");
    
    var navbarTitle = document.getElementById("navbar-title");

    var element = $(navObj);
    element.unbind("click tap");

		if(foldername) {
			navbarTitle.innerHTML = foldername;
      navObj.style.backgroundPosition = "0px -150px";
      element.on("click tap", function(e){ e.preventDefault(); navChangeClick(folderkey); });
			console.log(navObj);
		} else {
			navbarTitle.innerHTML = this.rootFolderName;
			navObj.style.backgroundPosition = "0px -200px";
		}
    this.listRows.css("visibility","hidden");
	}

  function attachFolderClick(e, data){ 
    if(data.contentkey) { 
      mf.navigateToFolder(data.name , data.contentkey) 
    } 
  }

	function navChangeClick(folderkey) {
	  console.log("navChangeClick - folderkey=" + folderkey);
	  mf.getFolderDepth({folderkey: folderkey});
	}

	return MediaFire;

}(Zepto));


document.addEventListener('touchmove', function (e) { e.preventDefault(); }, false);
var loginValues={
	loginOptions : {
		apiVersion: 1.2, 
		appKey: 'pcpx9eqrtfwy0b7cyooeoe69w6r7oy56g3qe3bb7'
	},
	loginCredentials:{
		projectKey:43875,
		username:'anbu.r@imaginea.com',
		password:'mfAnbu#123'
	}
}
var mf = new MEDIAFIRE(loginValues);
mf.handleClick();
mf.login();



