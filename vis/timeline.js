(function () {
  d3.timeline = function() {
    var hover = function () {},
      mouseover = function(){return tooltip.style("visibility", "visible");},
      mousemove = function(text){return tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px").text(text);},
      mouseout = function(){return tooltip.style("visibility", "hidden");},
      click = function () {},
      scroll = function () {},
      labelFunction = function(label) { return label; },
      navigateLeft = function () {},
      navigateRight = function () {},
      width = null,
      height = null,
      rowSeparatorsColor = null,
      backgroundColor = null,
      tickFormat = { format: d3.time.format("%I %p"),
        tickTime: d3.time.hours,
        tickInterval: 1,
        tickSize: 6,
        tickValues: null
      },
      tempTickFormat = {
        tickValues: [25,37.5,50,62.5,75],
        majorTickLength: 6,
        minorTickLength: 4
      },
      timelineColor = () => "black",//the color of the actual lines on the timeline
      annotationColor = () => "black", //the color of other lines and annotations
      backgroundColor = () => "white", //the color of the background
      colorPropertyName = null,
      beginning = -1,
      ending = -1,
      labelMargin = 0,
      margin = {left: 10, right:10, top: 10, bottom:10},
      stacked = false,
      topAndBottom = false;
      rotateTicks = false,
      fullLengthBackgrounds = false,
      itemHeight = 5,
      itemMargin = 0,
      blockMargin = 0,
      blocksPerBoxX = 12
      blocksPerBoxY = 24
      blockMargin = 0.5,
      navMargin = 60,
      showDates = false,
      showTimeAxis = false,
      showTempAxis = false,
      showAxisTop = false,
      timeAxisTick = false,
      timeAxisTickFormat = {stroke: "stroke-dasharray", spacing: "4 10"},
      showBorderLine = false,
      showBorderFormat = {width: 1, color: annotationColor},
      midnightBorderFormat = {width: 1, color: annotationColor},
      showPeopleHourBlocks = false,
      tempMin = 25,
      tempMax = 75,
      showAxisHeaderBackground = false,
      showAxisNav = false,
      showAxisCalendarYear = false,
      axisBgColor = "white",
      chartData = {}
    ;

    function timeline (gParent) {
      //setup
      var g = gParent.append("g");
      var gParentSize = gParent[0][0].getBoundingClientRect();
      var gParentItem = d3.select(gParent[0][0]);
      var yAxisMapping = {};
      var maxStack = 1;
      setWidth();
      setHeight();
      const blockWidth = (getBottom() - getTop() - (blocksPerBoxX+1)*blockMargin - midnightBorderFormat.width)/blocksPerBoxX;
      const blockHeight = (getBottom() - getTop() - (blocksPerBoxY+1)*blockMargin)/blocksPerBoxY;

      // figure out beginning and ending times if they are unspecified
      if (ending === -1 || beginning === -1) setBeginningAndEnding()

      //define various scales
      var scaleFactor = (1/(ending - beginning)) * (width - margin.left - margin.right);
      var xScale = d3.time.scale()
        .domain([beginning, ending])
        .range([margin.left, width - margin.right]);
      var yTempScale = d3.scale.linear()
        .domain([tempMin, tempMax])
        .range([getBottom(), getTop()]);

      //draw vertical line for every midnight
      appendMidnights();

      //add people hour blocks
      if(showPeopleHourBlocks) appendPeopleHourBlocks();

      //add temperature line graph
      appendTemperatureLine();

      //draw tick for each tentcheck
      if (showBorderLine) appendTentCheckTicks();

      //display date of each box
      if (showDates) appendDates();

      //show year
      appendYear();
      
      //add line to form top of boxes
      appendTopBar(showBorderFormat);

      // draw the timeline itself
      appendTimeline();

      //show axes
      if (showTempAxis) { appendTempAxis(g, yTempScale); }
      var belowLastItem = (margin.top + (itemHeight + itemMargin) * maxStack);
      var aboveFirstItem = margin.top;
      var timeAxisYPosition = showAxisTop ? aboveFirstItem : belowLastItem;
      var xAxis = d3.svg.axis()
      .scale(xScale)
      .orient("bottom")
      .tickFormat(tickFormat.format)
      .tickSize(tickFormat.tickSize);
      if (tickFormat.tickValues != null) {
        xAxis.tickValues(tickFormat.tickValues);
      } else {
        xAxis.ticks(tickFormat.numTicks || tickFormat.tickTime, tickFormat.tickInterval);
      }
      if (showTimeAxis) { appendTimeAxis(g, xAxis, timeAxisYPosition); }
      if (timeAxisTick) { appendTimeAxisTick(g, xAxis, maxStack); }

      if (rotateTicks) {
        g.selectAll(".tick text")
          .attr("transform", function(d) {
            return "rotate(" + rotateTicks + ")translate("
              + (this.getBBox().width / 2 + 10) + ","
              + this.getBBox().height / 2 + ")";
          });
      }

      var gSize = g[0][0].getBoundingClientRect();

      function getXPos(d, i) {
        return margin.left + (d.startingtime - beginning) * scaleFactor;
      }

      function getXTextPos(d, i) {
        return margin.left + (d.startingtime - beginning) * scaleFactor + 5;
      }

      function setHeight() {
        if (!height && !gParentItem.attr("height")) {
          if (itemHeight) {
            // set height based off of item height
            height = gSize.height + gSize.top - gParentSize.top;
            // set bounding rectangle height
            d3.select(gParent[0][0]).attr("height", height);
          } else {
            throw "height of the timeline is not set";
          }
        } else {
          if (!height) {
            height = gParentItem.attr("height");
          } else {
            gParentItem.attr("height", height);
          }
        }
      }

      function setWidth() {
        if (!width && !gParentSize.width) {
          try {
            width = gParentItem.attr("width");
            if (!width) {
              throw "width of the timeline is not set. As of Firefox 27, timeline().with(x) needs to be explicitly set in order to render";
            }
          } catch (err) {
            console.log( err );
          }
        } else if (!(width && gParentSize.width)) {
          try {
            width = gParentItem.attr("width");
          } catch (err) {
            console.log( err );
          }
        }
        // if both are set, do nothing
      }

      function appendTopBar(lineFormat){
        gParent.append("svg:line")
          .attr("x1", fullLengthBackgrounds ? 0 : margin.left)
          .attr("y1", getTop())
          .attr("x2", fullLengthBackgrounds ? width : (width - margin.right))
          .attr("y2", getTop())
          .style("stroke", lineFormat.color)
          .style("stroke-width", lineFormat.width);
      }

      function appendTentCheckTicks(){
        g.each(function (d, i) {
          d.forEach(function (datum) {
            datum.tentchecks.forEach(function (tentcheck) {
              if(tentcheck.startingtime > beginning){
                var x = xScale(tentcheck.startingtime);
                var y = getBottom() + itemHeight/2;

                gParent.append("svg:line")
                  .attr("x1", x - showBorderFormat.width/2)
                  .attr("y1", y - itemHeight)
                  .attr("x2", x - showBorderFormat.width/2)
                  .attr("y2", y + itemHeight)
                  .style("stroke", showBorderFormat.color)
                  .style("stroke-width", showBorderFormat.width);
              }
            });
          });
        });
      }

      function appendDates(){
        var format = d3.time.format("%a %b %-d");
        const textMargin = 10;
        g.each((d) => {
          d.forEach((datum) => {
            datum.days.forEach((day, index) => {
              if(index != datum.days.length-1){ //don't want text for last fake day added to show last box
                g.insert("text")
                  .attr("x", xScale(day.midnight) + getBoxWidth()/2)
                  .attr("y", getTop() + textMargin)
                  .attr("text-anchor", "middle")
                  .attr("fill", "#444444")
                  .text("Day "+(index+1)+": "+format(unixToDate(day.midnight)));
              }
            });
          });
        });
      }
      
      function appendYear() {
        var x = 0;
        var y = (getTop() + getBottom())/2

        g.each((d) => {
          d.forEach((datum) => {
            g.insert("text")
              .attr("x", x)
              .attr("y", y)
              .attr("transform", "rotate(-90,"+x+","+y+")")
              .attr("text-anchor", "middle") //since rotated, vertical alignment
              .attr("alignment-baseline", "hanging") //since rotated, horizontal alignment
              .attr("font-size", 65)
              .text(datum.year);
          });
        });
      }

      function insertBlock(midnight, row, col, r, offset, color){
        g.insert("rect")
          .attr("x", (xScale(midnight) + midnightBorderFormat.width/2 + (blockMargin + blockWidth)*col + blockMargin + blockWidth * offset))
          .attr("width", blockWidth * r)
          .attr("y", getBottom() - (blockMargin + blockHeight)*(row+1))
          .attr("height", blockHeight)
          .attr("fill", color)
          .attr("fill-opacity", color == "#f4a460" ? "0.4": "0.3");
      }

      function appendPeopleHourBlocks(){
        g.each((d) => {
          d.forEach((datum) => {
            datum.days.forEach((day) => {
              // day.blackhours = 24;
              // day.bluehours = day.whitehours = 12;

              var protruding = 0; //fraction of bloack left over by last period
              var counter = 0; //index of next block to add
              [{hours: day.blackhours, color: '#000000'}, 
                {hours: day.bluehours, color: '#123456'},
                {hours: day.whitehours, color: '#f4a460'}
              ].forEach((per) => {
                //determine if last period left a partial block
                if(protruding > 0 && per.hours > 0){
                  //finish partial block
                  counter--;
                  var row = Math.floor(counter/12);
                  var col = counter%12;
                  var r = Math.min(1 - protruding, per.hours);
                  var offset = protruding;
                  insertBlock(day.midnight, row, col, r, offset, per.color);

                  //update vars
                  protruding = 0;
                  per.hours -= r;
                  counter++; //note decremented earlier in if
                }

                for(var i = 0; i < Math.ceil(per.hours); i++){
                  var row = Math.floor(counter/12);
                  var col = counter%12;
                  var r = i+1 > per.hours ? per.hours - i: 1
                  insertBlock(day.midnight, row, col, r, 0, per.color);
                  counter++;
                }

                protruding = per.hours % 1;
              });
            });
          });
        });
      }

      function appendMidnights(){
        g.each(function (d) {
          d.forEach(function (datum) {
            datum.days.forEach(function (day, index) {
              gParent.append("svg:line")
                .attr("x1", xScale(day.midnight))
                .attr("y1", getTop()) //default to chart top if unspecified
                .attr("x2", xScale(day.midnight))
                .attr("y2", getBottom() + (index == 0 || index == datum.days.length-1 ? itemHeight+0.25: 0)) //need first and last vertical line to extend through timeline
                .style("stroke", midnightBorderFormat.color)
                .style("stroke-width", midnightBorderFormat.width);
            });
          });
        });
      }

      function appendTemperatureLine(){
        var valueline = d3.svg.line()
          .x((d) => xScale(d.hour))
          .y((d) => yTempScale(d.temperature))

        var format = d3.time.format("%-I %p");

        g.each((d) => {
          d.forEach((datum) => {
            g.append("path")
              .attr("class", "line")
              .attr("d", valueline(datum.weather));

              datum.weather.forEach((hourObj) => {
                g.append("svg:circle")
                  .attr("cx", xScale(hourObj.hour))
                  .attr("cy", yTempScale(hourObj.temperature))
                  .attr("r", blockWidth/4)
                  .attr("fill-opacity", 0)
                  .on("mouseover", mouseover)
                  .on("mousemove", () => mousemove(format(unixToDate(hourObj.hour))+": "+hourObj.temperature+"\u00B0"))
                  .on("mouseout", mouseout)
                  .on("click", click)
              });
          });
        });
      }

      function setBeginningAndEnding(){
        minTime = -1,
        maxTime = -1;
  
        g.each(function (d) {
          d.forEach(function (datum) {
            datum.days.forEach(function (day) {
              if(beginning === -1 && (day.midnight < minTime || minTime === -1)) minTime = day.midnight;
              if(ending === -1 && day.midnight > maxTime) maxTime = day.midnight;
            });
          });
        });
        if (ending === -1) ending = maxTime + DAY_LENGTH; //account for last day
        if (beginning === -1) beginning = minTime;

        console.log(beginning,ending);
      }

      function appendTimeline(){
        g.each(function(d, i) {
          chartData = d;
          d.forEach( function(datum, index){
            var data = datum.tentchecks;
            var hasLabel = (typeof(datum.label) != "undefined");
  
            // issue warning about using id per data set. Ids should be individual to data elements
            if (typeof(datum.id) != "undefined") {
              console.warn("d3Timeline Warning: Ids per dataset is deprecated in favor of a 'class' key. Ids are now per data element.");
            }
  
            //show background of bottom in black so can see time not in tent in white
            if (backgroundColor) appendBackgroundBar(index, g, data, datum);
  
            g.selectAll("svg").data(data).enter()
              .append("rect")
              .attr("x", getXPos)
              .attr("y", getStackPosition)
              .attr("width", function (d, i) {
                return (d.endingtime - d.startingtime) * scaleFactor;
              })
              .attr("cy", function(d, i) {
                  return getStackPosition(d, i);
              })
              .attr("cx", getXPos)
              .attr("r", itemHeight / 2)
              .attr("height", itemHeight)
              .style("fill", function(d, i){
                var dColorPropName;
                if (d.color) return d.color;
                if( colorPropertyName ){
                  dColorPropName = d[colorPropertyName];
                  if ( dColorPropName ) {
                    return timelineColor( dColorPropName );
                  } else {
                    return timelineColor( datum[colorPropertyName] );
                  }
                }
                return timelineColor(index);
              })
              .on("mouseover", mouseover)
              .on("mousemove", (d) => mousemove(d.message))
              .on("mouseout", mouseout)
              .on("click", click)
              .attr("class", function (d, i) {
                return datum.class ? "timelineSeries_"+datum.class : "timelineSeries_"+index;
              })
              .attr("id", function(d, i) {
                // use deprecated id field
                if (datum.id && !d.id) {
                  return 'timelineItem_'+datum.id;
                }
  
                return d.id ? d.id : "timelineItem_"+index+"_"+i;
              })
            ;
  
            g.selectAll("svg").data(data).enter()
              .append("text")
              .attr("x", getXTextPos)
              .attr("y", getStackTextPosition)
              .text(function(d) {
                return d.label;
              })
            ;
  
            if (rowSeparatorsColor) {
              var lineYAxis = ( itemHeight + itemMargin / 2 + margin.top + (itemHeight + itemMargin) * yAxisMapping[index]);
              gParent.append("svg:line")
                .attr("class", "row-separator")
                .attr("x1", 0 + margin.left)
                .attr("x2", width - margin.right)
                .attr("y1", lineYAxis)
                .attr("y2", lineYAxis)
                .attr("stroke-width", 1)
                .attr("stroke", rowSeparatorsColor);
            }
  
            // add the label
            if (hasLabel) { appendLabel(gParent, yAxisMapping, index, hasLabel, datum); }
  
            if (typeof(datum.icon) !== "undefined") {
              gParent.append("image")
                .attr("class", "timeline-label")
                .attr("transform", "translate("+ 0 +","+ (margin.top + (itemHeight + itemMargin) * yAxisMapping[index])+")")
                .attr("xlink:href", datum.icon)
                .attr("width", margin.left)
                .attr("height", itemHeight);
            }
  
            function appendBackgroundBar(index, g, data, datum) {
              g.selectAll("svg").data(data).enter()
                .insert("rect")
                .attr("x", fullLengthBackgrounds ? 0 : margin.left)
                .attr("width", fullLengthBackgrounds ? width : (width - margin.right - margin.left))
                .attr("y", getStackPosition(datum, index) - 0.25) //offset y and height slightly so that background appears a tiny bit above the top and bottom to look like =======
                .attr("height", itemHeight+0.5)
                .attr("fill", backgroundColor instanceof Function ? backgroundColor(datum, index) : backgroundColor)
              ;
            };
            function getStackPosition(d, i) {
              if (topAndBottom){
                if(index == 0)return getBottom();
                return getTop();
              }
              if (stacked) {
                return margin.top + (itemHeight + itemMargin) * yAxisMapping[index];
              }
              return margin.top;
            }
            function getStackTextPosition(d, i) {
              if (stacked) {
                return margin.top + (itemHeight + itemMargin) * yAxisMapping[index] + itemHeight * 0.75;
              }
              return margin.top + itemHeight * 0.75;
            }
          });
        });
      }
    }

    var appendTempAxis = function(g, yTempScale) {
      var isMajorTick = (i) => i%2 == 0;

      var makeTempAxis = (orient) => {
        yTempAxis = d3.svg.axis()
          .scale(yTempScale)
          .tickValues(tempTickFormat.tickValues)
          .tickSize(tempTickFormat.majorTickLength)
          .tickFormat((d, i) => isMajorTick(i) ? d+"\u00B0" : "")
          .orient(orient)
      
        var axisGroup = g.append("g")
          .attr("class", "axis")
          .attr("transform", "translate(" + (orient == "left"? margin.left : width - margin.right) + "," +  0 + ")")
          .call(yTempAxis)
          .call(g => g.select(".domain").remove()) //remove axis line, leaving only ticks, labels
          
        axisGroup.selectAll("g")
          .filter((d, i) => !isMajorTick(i)) //select minor ticks
          .attr("stroke-dasharray", tempTickFormat.minorTickLength+","+tempTickFormat.majorTickLength) //make shorter by strategically setting to truncated dashed line
      }

      makeTempAxis("left")
      makeTempAxis("right")
    }

    var appendTimeAxis = function(g, xAxis, yPosition) {
      if(showAxisHeaderBackground){ appendAxisHeaderBackground(g, 0, 0); }
      if(showAxisNav){ appendTimeAxisNav(g) };

      g.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + 0 + "," + yPosition + ")")
        .call(xAxis);
    };

    var appendTimeAxisCalendarYear = function (nav) {
      var calendarLabel = beginning.getFullYear();

      if (beginning.getFullYear() != ending.getFullYear()) {
        calendarLabel = beginning.getFullYear() + "-" + ending.getFullYear()
      }

      nav.append("text")
        .attr("transform", "translate(" + 20 + ", 0)")
        .attr("x", 0)
        .attr("y", 14)
        .attr("class", "calendarYear")
        .text(calendarLabel)
      ;
    };
    
    var appendTimeAxisNav = function (g) {
      var timelineBlocks = 6;
      var leftNavMargin = (margin.left - navMargin);
      var incrementValue = (width - margin.left)/timelineBlocks;
      var rightNavMargin = (width - margin.right - incrementValue + navMargin);

      var nav = g.append('g')
          .attr("class", "axis")
          .attr("transform", "translate(0, 20)")
        ;

      if(showAxisCalendarYear) { appendTimeAxisCalendarYear(nav) };

      nav.append("text")
        .attr("transform", "translate(" + leftNavMargin + ", 0)")
        .attr("x", 0)
        .attr("y", 14)
        .attr("class", "chevron")
        .text("<")
        .on("click", function () {
          return navigateLeft(beginning, chartData);
        })
      ;

      nav.append("text")
        .attr("transform", "translate(" + rightNavMargin + ", 0)")
        .attr("x", 0)
        .attr("y", 14)
        .attr("class", "chevron")
        .text(">")
        .on("click", function () {
          return navigateRight(ending, chartData);
        })
      ;
    };

    function appendAxisHeaderBackground(g, xAxis, yAxis) {
      g.insert("rect")
        .attr("class", "row-green-bar")
        .attr("x", xAxis)
        .attr("width", width)
        .attr("y", yAxis)
        .attr("height", itemHeight)
        .attr("fill", axisBgColor);
    };

    function appendTimeAxisTick(g, xAxis, maxStack) {
      g.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + 0 + "," + (margin.top + (itemHeight + itemMargin) * maxStack) + ")")
        .attr(timeAxisTickFormat.stroke, timeAxisTickFormat.spacing)
        .call(xAxis.tickFormat("").tickSize(-(margin.top + (itemHeight + itemMargin) * (maxStack - 1) + 3), 0, 0));
    };

    function appendLabel(gParent, yAxisMapping, index, hasLabel, datum) {
      var fullItemHeight    = itemHeight + itemMargin;
      var rowsDown          = margin.top + (fullItemHeight/2) + fullItemHeight * (yAxisMapping[index] || 1);

      gParent.append("text")
        .attr("class", "timeline-label")
        .attr("transform", "translate(" + labelMargin + "," + rowsDown + ")")
        .text(hasLabel ? labelFunction(datum.label) : datum.id)
        .on("click", function (d, i) { click(d, index, datum); });
    };

    function unixToDate(unixTimestamp){
      return new Date(unixTimestamp*1000);
    }

    function getTop(){
      return margin.top;
    }

    function getBottom(){
      return height - margin.bottom;
    }

    function getBoxHeight(){
      return getBottom() - getTop();
    }

    function getBoxWidth(){
      return getBoxHeight();
    }

    // SETTINGS
    timeline.margin = function (p) {
      if (!arguments.length) return margin;
      margin = p;
      return timeline;
    };

    timeline.itemHeight = function (h) {
      if (!arguments.length) return itemHeight;
      itemHeight = h;
      return timeline;
    };

    timeline.itemMargin = function (h) {
      if (!arguments.length) return itemMargin;
      itemMargin = h;
      return timeline;
    };

    timeline.navMargin = function (h) {
      if (!arguments.length) return navMargin;
      navMargin = h;
      return timeline;
    };

    timeline.height = function (h) {
      if (!arguments.length) return height;
      height = h;
      return timeline;
    };

    timeline.width = function (w) {
      if (!arguments.length) return width;
      width = w;
      return timeline;
    };

    timeline.labelFormat = function(f) {
      if (!arguments.length) return labelFunction;
      labelFunction = f;
      return timeline;
    };

    timeline.tickFormat = function (format) {
      if (!arguments.length) return tickFormat;
      tickFormat = format;
      return timeline;
    };

    timeline.hover = function (hoverFunc) {
      if (!arguments.length) return hover;
      hover = hoverFunc;
      return timeline;
    };

    timeline.mouseover = function (mouseoverFunc) {
      if (!arguments.length) return mouseover;
      mouseover = mouseoverFunc;
      return timeline;
    };

    timeline.mousemove = function (mousemoveFunc) {
      if (!arguments.length) return mosemove;
      mousemove = mousemoveFunc;
      return timeline;
    };

    timeline.mouseout = function (mouseoutFunc) {
      if (!arguments.length) return mouseout;
      mouseout = mouseoutFunc;
      return timeline;
    };

    timeline.click = function (clickFunc) {
      if (!arguments.length) return click;
      click = clickFunc;
      return timeline;
    };

    timeline.scroll = function (scrollFunc) {
      if (!arguments.length) return scroll;
      scroll = scrollFunc;
      return timeline;
    };

    timeline.color = function (color) {
      if (!arguments.length) return timelineColor;
      timelineColor = (() => color);
      return timeline;
    };

    timeline.annotationColor = function (color) {
      if (!arguments.length) return annotationColor;
      annotationColor = (() => color);
      return timeline;
    };

    timeline.backgroundColor = function (color) {
      if (!arguments.length) return backgroundColor;
      backgroundColor = (() => color);
      return timeline;
    };

    timeline.beginning = function (b) {
      if (!arguments.length) return beginning;
      beginning = b;
      return timeline;
    };

    timeline.ending = function (e) {
      if (!arguments.length) return ending;
      ending = e;
      return timeline;
    };

    timeline.labelMargin = function (m) {
      if (!arguments.length) return labelMargin;
      labelMargin = m;
      return timeline;
    };

    timeline.rotateTicks = function (degrees) {
      if (!arguments.length) return rotateTicks;
      rotateTicks = degrees;
      return timeline;
    };

    timeline.stack = function () {
      stacked = !stacked;
      return timeline;
    };

    timeline.topAndBottom = function () {
      topAndBottom = !topAndBottom;
      return timeline;
    }

    timeline.showDates = function () {
      showDates = !showDates;
      return timeline;
    };

    timeline.showBorderLine = function () {
      showBorderLine = !showBorderLine;
      return timeline;
    };

    timeline.showPeopleHourBlocks = function () {
      showPeopleHourBlocks = !showPeopleHourBlocks;
      return timeline;
    };

    timeline.showBorderFormat = function(borderFormat) {
      if (!arguments.length) return showBorderFormat;
      showBorderFormat = borderFormat;
      return timeline;
    };

    timeline.colorProperty = function(colorProp) {
      if (!arguments.length) return colorPropertyName;
      colorPropertyName = colorProp;
      return timeline;
    };

    timeline.rowSeparators = function (color) {
      if (!arguments.length) return rowSeparatorsColor;
      rowSeparatorsColor = color;
      return timeline;

    };

    timeline.showTempAxis = function () {
      showTempAxis = !showTempAxis;
      return timeline;
    };

    timeline.showTimeAxis = function () {
      showTimeAxis = !showTimeAxis;
      return timeline;
    };

    timeline.showAxisTop = function () {
      showAxisTop = !showAxisTop;
      return timeline;
    };

    timeline.showAxisCalendarYear = function () {
      showAxisCalendarYear = !showAxisCalendarYear;
      return timeline;
    };

    timeline.showTimeAxisTick = function () {
      timeAxisTick = !timeAxisTick;
      return timeline;
    };

    timeline.fullLengthBackgrounds = function () {
      fullLengthBackgrounds = !fullLengthBackgrounds;
      return timeline;
    };

    timeline.showTimeAxisTickFormat = function(format) {
      if (!arguments.length) return timeAxisTickFormat;
      timeAxisTickFormat = format;
      return timeline;
    };

    timeline.showAxisHeaderBackground = function(bgColor) {
      showAxisHeaderBackground = !showAxisHeaderBackground;
      if(bgColor) { (axisBgColor = bgColor) };
      return timeline;
    };

    timeline.navigate = function (navigateBackwards, navigateForwards) {
      if (!arguments.length) return [navigateLeft, navigateRight];
      navigateLeft = navigateBackwards;
      navigateRight = navigateForwards;
      showAxisNav = !showAxisNav;
      return timeline;
    };

    return timeline;
  };
})();

const FIRST_DAY = 8; //day when all timelines start (1/8)
const DAY_LENGTH = 60*60*24;
const ROW_HEIGHT = 200;
const ROW_MARGINS = {left: 100, right: 40, top: 5, bottom: 25};

function makeTimeline(data) {
  console.log("loading...")
  var svg = d3.select("#vis").append("svg")
    .attr("width", 10000)
    .attr("height", (ROW_HEIGHT + ROW_MARGINS.top + ROW_MARGINS.bottom)*Object.keys(data).length)
    .style("font", "10px times")

  var rownum = 0;
  ["2019","2018","2017","2016","2015"].reverse().forEach((year) => {
    console.log(year)
    var yearData = data[year];
    var lastMidnight = yearData.days[yearData.days.length-1].midnight + DAY_LENGTH
    yearData.days.push({midnight: lastMidnight, peoplehours: 0}); //need to add an extra day with no peoplehours to make last box
    numDays = yearData.days.length - 1;
    dayHeight = ROW_HEIGHT - ROW_MARGINS.top - ROW_MARGINS.bottom
    width = numDays * dayHeight + ROW_MARGINS.left + ROW_MARGINS.right;

    var chart = d3.timeline()
      .margin(ROW_MARGINS)
      .topAndBottom()
      .itemHeight(4)
      .color("white")
      .backgroundColor("black")
      .showTempAxis()
      .showPeopleHourBlocks()
      .showDates()
      .beginning(yearData.days[0].midnight) //start at first midnight...
      .ending(lastMidnight); //...and continue up to last midnight

    svg.append("g")
      .attr("width", width)
      .attr("height",ROW_HEIGHT)
      .attr("transform", "translate("+ ((yearData.startday - FIRST_DAY)*dayHeight + 100) +","+ (ROW_HEIGHT + ROW_MARGINS.top + ROW_MARGINS.bottom)*rownum +")")
      .datum([yearData]).call(chart);
    
    rownum++;
  });
}

d3.json("./data.json", function(data) {
  makeTimeline(data);
});