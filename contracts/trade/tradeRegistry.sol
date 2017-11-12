pragma solidity ^ 0.4.11;

import "./TradeLib.sol";

contract Trade {
    address owner;
    
    using TradeLib for TradeLib.Trade;
    /**
   EVENTS
  */
    event LogTradeCreated();
    event LogGetDoc(bytes32 indexed uid, bytes hash);
    event LogDeposit(bytes32 indexed uid, uint amount);
    event LogPayment(string status);
    
    /*
      MODIFIERS
    ========================================================================
  */
    /**
	 * Set permission so that owner can be the only accessor
	 */
	modifier onlyBy() {
		if (msg.sender != owner) {
			throw;
		}
		_;
	}
	
  mapping (bytes32 => TradeLib.Trade) trades;
	
	function Trade(){
	    owner = msg.sender;
	}
	
  function createTrade(bytes32 uid, address[] tradeParties, bytes32[] docs){
      trades[uid].tradeParties = tradeParties;
      trades[uid].doctype = docs;
      trades[uid].initDocs(docs);
      LogTradeCreated();
  }
  
  function uploadDoc(bytes32 uid, address sender, bytes32 docType, bytes _hash){
      trades[uid].upload(sender, docType, _hash);
  }
  
  function getInvoiceAmount(bytes32 uid) returns(uint){
      return trades[uid].amount;
  }
  
  function getExpiryDate(bytes32 uid) returns(uint){
      return trades[uid].expiresOn;
  }
  
  function getLatestDoc(bytes32 uid, bytes32 docName){
      trades[uid].getLatestDoc(docName);
  }
  
  function action(bytes32 uid, address sender, bytes32 docName, bytes32 action, bytes extraData){
     trades[uid].action(sender, docName, action, extraData);
  }
  
  function deposit(bytes32 uid) payable{
      LogDeposit(uid, msg.value);
  }
  
  function pay(bytes32 uid) onlyBy returns(bool) {
      if(now> trades[uid].shippingDate + trades[uid].loc.noOfDays && trades[uid].shippingDate < (trades[uid].issueDate + trades[uid].loc.noOfDays)){
			trades[uid].payToSeller();
			LogPayment("True");
			return true;
		}
		LogPayment("False");
		return false;
	}
}
