"use strict";
const should = require("should");

const DataValue =  require("node-opcua-data-value").DataValue;
const Variant = require("node-opcua-variant").Variant;
const DataType = require("node-opcua-variant").DataType;
const VariantArrayType = require("node-opcua-variant").VariantArrayType;
const StatusCodes = require("node-opcua-status-code").StatusCodes;

const SessionContext = require("../..").SessionContext;
const context = SessionContext.defaultContext;


const AddressSpace = require("../../").AddressSpace;

module.exports = function(maintest) {

    describe("MultiStateValueDiscreteType", function () {

        let addressSpace, namespace;
        before(function() {
            addressSpace = maintest.addressSpace;
            namespace =addressSpace.getOwnNamespace();

            should(addressSpace).be.instanceof(AddressSpace);
        });

        it("MultiStateValueDiscreteType should not be abstract",function() {

            const multiStateValueDiscreteType = addressSpace.findVariableType("MultiStateValueDiscreteType");
            multiStateValueDiscreteType.isAbstract.should.eql(false);

        });

        it("should add a MultiStateValueDiscreteType variable - form 1",function() {

            const objectsFolder = addressSpace.findNode("ObjectsFolder");
            objectsFolder.browseName.toString().should.eql("Objects");

            const prop = namespace.addMultiStateValueDiscrete({
                organizedBy: objectsFolder,
                browseName: "MyMultiStateValueVariable",
                enumValues: { "Red": 0xFF0000,"Orange": 0xFF9933,"Green":0x00FF00,"Blue": 0x0000FF },
                value: 0xFF0000 // Red
            });
            prop.browseName.toString().should.eql("1:MyMultiStateValueVariable");

            prop.valueRank.should.eql(-1); //ValueRank=Scalar

            const v = prop.getPropertyByName("EnumValues").readValue().value;
            v.dataType.should.eql(DataType.ExtensionObject);
            v.arrayType.should.eql(VariantArrayType.Array);
            v.value.length.should.eql(4);
            v.value[0].constructor.name.should.eql("EnumValueType");
            //xx .should.eql("Variant(Array<LocalizedText>, l= 3, value=[locale=null text=Red,locale=null text=Orange,locale=null text=Green])");


            prop.readValue().value.toString().should.eql("Variant(Scalar<UInt32>, value: 16711680)");
            prop.readValue().value.dataType.should.eql(DataType.UInt32);

            prop.valueAsText.readValue().value.value.text.should.eql("Red");

        });
        it("should add a MultiStateValueDiscreteType variable - form 2",function() {

            const objectsFolder = addressSpace.findNode("ObjectsFolder");
            objectsFolder.browseName.toString().should.eql("Objects");

            const prop = namespace.addMultiStateValueDiscrete({
                organizedBy: objectsFolder,
                browseName: "MyMultiStateValueVariable",
                enumValues: [
                    { displayName: "Red",    value: 0xFF0000},
                    { displayName: "Orange", value: 0xFF9933},
                    { displayName: "Green",  value: 0x00FF00},
                    { displayName: "Blue",   value: 0x0000FF}
                ],
                value: 0xFF0000 // Red
            });
        });
        describe("edge case tests",function() {

            let multiStateValue;
            before(function() {
                const objectsFolder = addressSpace.findNode("ObjectsFolder");
                objectsFolder.browseName.toString().should.eql("Objects");
                multiStateValue = namespace.addMultiStateValueDiscrete({
                    organizedBy: objectsFolder,
                    browseName: "MyMultiStateValueVariable",
                    enumValues: { "Red": 0xFF0000,"Orange": 0xFF9933,"Green":0x00FF00,"Blue": 0x0000FF },
                    value: 0xFF0000 // Red
                });

            });
            after(function() {

            });

            it("writing a value not in the EnumValues mapshall return BadOutOfRange",function(done) {

                const dataValue = new DataValue({
                    value: new Variant({dataType: DataType.UInt32, value: 100})// out of range
                });
                multiStateValue.writeValue(context, dataValue, null, function (err, statusCode) {
                    statusCode.should.eql(StatusCodes.BadOutOfRange);
                    done(err);
                });
            });

            it("writing a value within EnumValues shall return Good",function(done) {

                const dataValue = new DataValue({
                    value: new Variant({dataType: DataType.UInt32, value: 0x0000FF})// OK
                });

                multiStateValue.writeValue(context, dataValue, null, function (err, statusCode) {

                    statusCode.should.eql(StatusCodes.Good);

                    //Xx console.log(  multiStateValue._dataValue.toString());
                    //Xx console.log(  multiStateValue.valueAsText._dataValue.toString());

                    multiStateValue.valueAsText.readValue().value.value.text.should.eql("Blue");
                    done(err);
                });
            });

            it("changing  MultiStateVariable value shall change valueAsText accordingly",function(done) {
                const dataValue = new DataValue({
                    value: new Variant({dataType: DataType.UInt32, value: 0x00FF00})// OK
                });
                multiStateValue.writeValue(context, dataValue, null, function (err, statusCode) {

                    statusCode.should.eql(StatusCodes.Good);
                    multiStateValue.valueAsText.readValue().value.value.text.should.eql("Green");

                    done(err);
                });
            });
        });

        it("ZZ2 should instantiate a DataType containing a MultiStateValueDiscreteType",function(done) {

            const namespace= addressSpace.getOwnNamespace();
            // create a new DataType
            const myObjectType = namespace.addObjectType({
                browseName: "MyObjectWithMultiStateValueDiscreteType"
            });
            const multiStateValue = namespace.addMultiStateValueDiscrete({
                componentOf: myObjectType,
                browseName:  "Color",
                enumValues:  { "Red": 0xFF0000,"Orange": 0xFF9933,"Green":0x00FF00,"Blue": 0x0000FF },
                value: 0xFF0000, // Red,
                modellingRule: "Mandatory"
            });

            should.exist(myObjectType.getComponentByName("Color"));

            myObjectType.color.accessLevel.key.should.eql("CurrentRead | CurrentWrite");
            // add


            // instanciate  the type
            const obj = myObjectType.instantiate({
                browseName: "MyObject"
            });

            // verification
            obj.color.accessLevel.key.should.eql("CurrentRead | CurrentWrite");
            obj.color.valueAsText.readValue().value.value.text.should.eql("Red");
            obj.color.readValue().value.value.should.eql(0xFF0000);

            obj.color.enumValues.readValue().value.value[0].displayName.text.should.eql("Red");
            obj.color.enumValues.readValue().value.value[1].displayName.text.should.eql("Orange");
            obj.color.enumValues.readValue().value.value[2].displayName.text.should.eql("Green");
            obj.color.enumValues.readValue().value.value[3].displayName.text.should.eql("Blue");


            const greenValue = obj.color.enumValues.readValue().value.value[2].value[1];
            // now change the value => verify that valueAsText will change accordingly
            const dataValue = new DataValue({
                value: new Variant({dataType: DataType.UInt32, value: greenValue})// OK
            });

            obj.color.writeValue(context, dataValue, null, function (err, statusCode) {
                statusCode.should.eql(StatusCodes.Good);

                // now verify that valueAsText has been updated accordingly...
                obj.color.valueAsText.readValue().value.value.text.should.eql("Green");
                done(err);
            });


        })
    });

};
