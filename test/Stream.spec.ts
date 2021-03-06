import * as S from "../src/Stream";
import {Stream} from "../src/Stream";
import * as B from "../src/Behavior";
import {Behavior, at} from "../src/Behavior";
import {assert} from "chai";
import {spy} from "sinon";

const addTwo = (v: number): number => v + 2;
const sum = (a: number, b: number): number => a + b;

describe("Stream", () => {
  describe("isStream", () => {
    it("should be true when Stream object", () => {
      assert.isTrue(S.isStream(S.empty()));
    });

    it("should be false when not Stream object", () => {
      assert.isFalse(S.isStream([]));
      assert.isFalse(S.isStream({}));
      assert.isFalse(S.isStream("test"));
      assert.isFalse(S.isStream([S.empty()]));
      assert.isFalse(S.isStream(1234));
      assert.isFalse(S.isStream(S.isStream));
    });
  });

  describe("subscribe", () => {
    it("supports multiple listeners", () => {
      const s = S.empty();
      const cb1 = spy();
      const cb2 = spy();
      s.subscribe(cb1);
      s.subscribe(cb2);
      S.publish(2, s);
      S.publish(3, s);
      assert.strictEqual(cb1.callCount, 2);
      assert.strictEqual(cb2.callCount, 2);
    });
    it("single listeners can be removed", () => {
      const s = S.empty();
      const cb1 = spy();
      const cb2 = spy();
      s.subscribe(cb1);
      const listener = s.subscribe(cb2);
      s.removeListener(listener);
      S.publish(2, s);
      S.publish(3, s);
      assert.strictEqual(cb1.callCount, 2);
      assert.strictEqual(cb2.callCount, 0);
    });
  });

  describe("publish", () => {
    it("should be a function", () => {
      assert.isFunction(S.publish);
    });

    it("should call the subscribers", () => {
      const obs = S.empty();
      const callback = spy();
      S.subscribe(callback, obs);

      assert.equal(callback.callCount, 0);

      S.publish("value", obs);
      assert.equal(callback.callCount, 1);

      S.publish("value", obs);
      assert.equal(callback.callCount, 2);
    });

    it("should pass the published value to subscribers", () => {
      const obs = S.empty();
      const callback1 = spy();
      const callback2 = spy();

      S.subscribe(callback1, obs);
      S.subscribe(callback2, obs);

      const err1 = "Wrong or no value was recieved after publish.";
      S.publish("random value", obs);
      assert(callback1.calledWith("random value"), err1);
      assert(callback2.calledWith("random value"), err1);

      const err2 = "Wrong or no value was recieved after a second publish.";
      S.publish("another random value", obs);
      assert(callback1.calledWith("another random value"), err2);
      assert(callback2.calledWith("another random value"), err2);
    });
  });

  describe("merge", () => {
    it("should be a function", () => {
      assert.isFunction(S.merge);
    });

    it("should merge two streams", () => {
      const stream1 = S.empty();
      const stream2 = S.empty();
      const callback = spy();

      const mergedS = S.merge(stream1, stream2);
      S.subscribe(callback, mergedS);
      S.publish(1, stream1);
      S.publish("2", stream2);

      assert.deepEqual(callback.args, [[1], ["2"]]);
    });
  });

  describe("map", () => {
    it("should be a function", () => {
      assert.isFunction(S.map);
    });

    it("should map the published values", () => {
      const obs = S.empty();
      const callback = spy();
      const mappedObs = S.map(addTwo, obs);
      S.subscribe(callback, mappedObs);
      for (let i = 0; i < 5; i++) {
        S.publish(i, obs);
      }
      assert.deepEqual(callback.args, [[2], [3], [4], [5], [6]]);
    });

    it("maps to a constant with mapTo", () => {
      const stream = S.empty();
      const callback = spy();
      const mapped = stream.mapTo(7);
      S.subscribe(callback, mapped);
      S.publish(1, stream);
      S.publish(2, stream);
      S.publish(3, stream);
      assert.deepEqual(callback.args, [[7], [7], [7]]);
    });
  });

  describe("filter", () => {
    it("should be a function", () => {
      assert.isFunction(S.filter);
    });

    it("should filter the unwanted publishions", () => {
      const obs = S.empty();
      const callback = spy();

      const isEven = (v: number): boolean => !(v % 2);

      const filteredObs = S.filter(isEven, obs);

      S.subscribe(callback, filteredObs);

      for (let i = 0; i < 10; i++) {
        S.publish(i, obs);
      }
      assert.deepEqual(callback.args, [[0], [2], [4], [6], [8]], "Wrong or no value was recieved");
    });
  });

  describe("scanS", () => {
    it("should scan the values to a stream", () => {
      const eventS = S.empty();
      const callback = spy();
      const sumF = (currSum: number, val: number) => currSum + val;
      const currentSumE = at(S.scanS(sumF, 0, eventS));
      S.subscribe(callback, currentSumE);
      for (let i = 0; i < 10; i++) {
        S.publish(i, eventS);
      }
      assert.deepEqual(callback.args, [[0], [1], [3], [6], [10], [15], [21], [28], [36], [45]]);
    });
  });

  describe("snapshot", () => {
    it("it snapshots pull based Behavior", () => {
      let n = 0;
      const b: Behavior<number> = B.fromFunction(() => n);
      const e: Stream<number> = S.empty<number>();
      const shot = S.snapshot<number, number>(b, e);
      const callback = spy();
      S.subscribe(callback, shot);
      S.publish(0, e);
      S.publish(1, e);
      n = 1;
      S.publish(2, e);
      n = 2;
      S.publish(3, e);
      S.publish(4, e);
      assert.deepEqual(callback.args, [
        [[0, 0]], [[1, 0]], [[2, 1]], [[3, 2]], [[4, 2]]
      ]);
    });
    it("it applies function in snapshotWith to pull based Behavior", () => {
      let n = 0;
      const b: Behavior<number> = B.fromFunction(() => n);
      const e: Stream<number> = S.empty<number>();
      const shot = S.snapshotWith<number, number, number>(sum, b, e);
      const callback = spy();
      S.subscribe(callback, shot);
      S.publish(0, e);
      S.publish(1, e);
      n = 1;
      S.publish(2, e);
      n = 2;
      S.publish(3, e);
      S.publish(4, e);
      assert.deepEqual(callback.args, [
        [0], [1], [3], [5], [6]
      ]);
    });
  });
});
