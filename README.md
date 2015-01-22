Mobile Web ListView for Bidirectional Infinite Scroll with Lazy loading 

Recently we were exploring infinite scroll listview that would support thousands of items without performance impact in terms of memory and processor speed for mobile browsers. This should be similar to the listview/tableview implementations on Android/iOS app frameworks. And the web app should be light-weight without using any heavy framework using components that just serve the purpose without bloated code.
The technical requirements of listview that suits the purpose are:
Bidirectional infinite scroll with lazy loading 
List elements should be recycled and fixed based on the device screen resolution
Smooth animation of scroll and fling
Lightweight and modular to fit into any framework
Handle memory efficiently to work on low end devices as well
When the list item is an image, thumbnail should be displayed
There are several javascript frameworks(http://propertycross.com/) that were available but not many were matching the above criteria. Hence we had a choice between writing our own listview or finding a list view that fits our requirements.
After filtering this frameworks we narrowed our focus to the javascript libraries which support listview with infinite scroll

ifininty.js by AirBnb
JQuery iScroll infinite
RAD.js infinite scroll

Infinity.js was not suited for mobile as it was heavy both in terms of the framework dependency and memory.
JQuery iScroll infinite was considered good. But on further analysis and usage we realized that the code is not customizable easily. Hence we had to abandon this approach.
Lastly with RAD.js toolkit had the flexibility to just reuse a listview without the burden of any heavy framework and also ability to modify the code suited our constraints well. RAD.js covers most of the aspects of listview with infinite scrolling suited for mobile. 

The table below captures the observations of running the RAD.js integrated listview on various mobile platforms and browsers. 


Platform
Version
Device
Browser
Supported
iOS
8.x
iPhone 5S
Safari
Yes
iOS
7.x
iPhone 4
Safari
Yes
iOS
7.x
iPad
Safari
Yes
Android
5.0 (L)
LG Nexus 5
Chrome
Yes






FireFox
Yes






Android Browser
N/A
Android
4.4.2 (KitKat)
Samsung Galaxy S4
Chrome
Yes






FireFox
Yes






Android Browser
Yes
Android
4.1.2 (JB)
Samsung S2
Chrome
Yes






FireFox
Yes






Android Browser
Yes*
Android
4.0.2 (ICS)
Samsung Galaxy Tab
Chrome
Yes






Firefox
Yes






Android Browser
Yes*
Android
2.3.3(GB)
LG-Optimus/HTC Aspire
Firefox
Yes






Android Browser
Yes






Chrome
N/A



*The CSS transform used for scroll animation during rearrangement of list items requires hardware acceleration. And the stock Android browsers on ICS and JB fall short on this front. An alternative strategy has to be arrived at to support this browsers.

