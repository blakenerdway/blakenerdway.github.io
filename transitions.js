class PageCount{
    constructor(){
        this._currPage = 1;
        this._pageTransition = new PageTransition();

    }


    pageBackward(){
        if (this._currPage !== 1){
            this._pageTransition.pageBackward();
        }

        this._currPage--;
        if (this._currPage === 1){
            $('#page-backward').attr("disabled", true);
        }

        $('#page-forward').attr("disabled", false);
    };

    pageForward(){
        if (this._currPage !== 3) {
            this._pageTransition.pageForward();
        }

        this._currPage++;
        if (this._currPage === 3){
            $('#page-forward').attr("disabled", true);
        }
        $('#page-backward').attr("disabled", false);
    };
}

class PageTransition {
    constructor() {
        this._transitioning = false;
    }


    pageBackward() {
        let parentObj = this;
        if (this._transitioning) {
            this._nextFN = this.pageBackward;
        }

        d3.select("#main-content-container").transition().style("transform", "translateX(100%)").delay(0)
            .duration(1500)
            .ease(d3.easeCubicInOut)
            .on("end", function () {
                d3.select("#main-content-container").style("transform", "translateX(-100%)").transition().style("transform", "translateX(0%)")
                    .delay(200)
                    .duration(1500)
                    .ease(d3.easeCubicInOut)
                    .on('end', function () {
                        if (parentObj._nextFN) {
                            console.log('Starting next function');
                            parentObj._nextFN();
                        }
                    });
            });
    }

    pageForward() {
        let parentObj = this;
        if (this._transitioning) {
            this._nextFN = this.pageBackward;
        }

        d3.select("#main-content-container").transition().style("transform", "translateX(-100%)").delay(0)
            .duration(1500)
            .ease(d3.easeCubicInOut)
            .on("end", function () {
                d3.select("#main-content-container").style("transform", "translateX(100%)").transition().style("transform", "translateX(0%)")
                    .delay(200)
                    .duration(1500)
                    .ease(d3.easeCubicInOut)
                    .on('end', function () {
                        if (parentObj._nextFN) {
                            console.log('Starting next function');
                            parentObj._nextFN();
                        }
                    });
            });
    }

}

function moveForward(){
    pageCount.pageForward();
}

function moveBackward(){
    pageCount.pageBackward();
}

pageCount = new PageCount();