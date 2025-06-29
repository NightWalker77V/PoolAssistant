import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [selectedType, setSelectedType] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reports, setReports] = useState({});

  // تابع ساده برای تاریخ شمسی
  const getCurrentPersianDate = () => {
    const now = new Date();
    return now.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // تابع ساعت فارسی
  const getCurrentPersianTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // انواع بلیط و قیمت‌ها
  const ticketTypes = [
    {id: 'adult', name: 'تعرفه آزاد', price: 220000, color: '#4CAF50', icon: 'person'},
    {id: 'child', name: 'زیر ۵ سال', price: 190000, color: '#2196F3', icon: 'child-care'},
    {id: 'poolro', name: 'پول‌رو', price: 0, color: '#FF9800', icon: 'card-membership'},
    {id: 'offticket', name: 'آف تیکت', price: 0, color: '#9C27B0', icon: 'local-offer'},
    {id: 'offcard', name: 'آف کارت', price: 0, color: '#E91E63', icon: 'credit-card'},
    {id: 'paper', name: 'بلیط کاغذی متفرقه', price: 0, color: '#795548', icon: 'receipt'},
    {id: 'private', name: 'آموزش خصوصی', price: 4700000, color: '#F44336', icon: 'school'},
    {id: 'semiprivate', name: 'آموزش نیمه خصوصی', price: 3800000, color: '#3F51B5', icon: 'group'},
    {id: 'cash', name: 'مبلغ نقدی', price: 0, color: '#607D8B', icon: 'attach-money'},
    {id: 'buffet_card', name: 'کارتخوان بوفه', price: 0, color: '#00BCD4', icon: 'credit-card'},
    {id: 'buffet_cash', name: 'نقدی بوفه', price: 0, color: '#8BC34A', icon: 'restaurant'},
  ];

  useEffect(() => {
    loadTickets();
  }, []);

  // بارگذاری بلیط‌ها از حافظه
  const loadTickets = async () => {
    try {
      const savedTickets = await AsyncStorage.getItem('tickets');
      if (savedTickets) {
        setTickets(JSON.parse(savedTickets));
      }
    } catch (error) {
      console.error('خطا در بارگذاری بلیط‌ها:', error);
    }
  };

  // ذخیره بلیط‌ها در حافظه
  const saveTickets = async (newTickets) => {
    try {
      await AsyncStorage.setItem('tickets', JSON.stringify(newTickets));
    } catch (error) {
      console.error('خطا در ذخیره بلیط‌ها:', error);
    }
  };

  // صدور بلیط جدید
  const issueTicket = async () => {
    if (!selectedType) {
      setConfirmMessage('لطفا نوع بلیط را انتخاب کنید');
      setConfirmAction(() => () => setShowConfirmModal(false));
      setShowConfirmModal(true);
      return;
    }

    const ticketType = ticketTypes.find(t => t.id === selectedType.id);
    let price = ticketType.price;

    // بررسی برای انواع بلیط‌هایی که نیاز به مبلغ دارند
    const needsAmount = ['cash', 'buffet_card', 'buffet_cash'];
    if (needsAmount.includes(selectedType.id)) {
      if (!customAmount || customAmount === '0') {
        setConfirmMessage('لطفا مبلغ را وارد کنید');
        setConfirmAction(() => () => setShowConfirmModal(false));
        setShowConfirmModal(true);
        return;
      }
      price = parseInt(customAmount.replace(/,/g, ''));
    }

    const now = new Date();
    const newTickets = [];

    for (let i = 0; i < quantity; i++) {
      const newTicket = {
        id: (Date.now() + i).toString(),
        type: selectedType.id,
        typeName: ticketType.name,
        price: price,
        timestamp: now.getTime(),
        date: getCurrentPersianDate(),
        time: getCurrentPersianTime(),
      };
      newTickets.push(newTicket);
    }

    const updatedTickets = [...tickets, ...newTickets];
    setTickets(updatedTickets);
    await saveTickets(updatedTickets);
    setShowModal(false);
    setSelectedType(null);
    setCustomAmount('');
    setQuantity(1);

    // بلیط بدون تایید صادر میشه!
  };

  // تولید گزارش
  const generateReport = () => {
    console.log('Generate Report Clicked!');
    const today = getCurrentPersianDate();
    const todayTickets = tickets.filter(ticket => ticket.date === today);
    
    const report = {};
    let totalAmount = 0;
    let totalCount = 0;

    ticketTypes.forEach(type => {
      const typeTickets = todayTickets.filter(ticket => ticket.type === type.id);
      const count = typeTickets.length;
      const amount = typeTickets.reduce((sum, ticket) => sum + ticket.price, 0);
      
      if (count > 0) {
        report[type.name] = {
          count: count,
          amount: amount,
          color: type.color
        };
        totalAmount += amount;
        totalCount += count;
      }
    });

    report.total = {
      count: totalCount,
      amount: totalAmount
    };

    setReports(report);
    setShowReportModal(true);
  };

  // ریست کردن روز - تابع اصلی
  const handleResetToday = () => {
    console.log('Reset Today Button Clicked!');
    
    const today = getCurrentPersianDate();
    const todayTickets = tickets.filter(ticket => ticket.date === today);
    
    console.log('Today date:', today);
    console.log('Today tickets:', todayTickets.length);
    
    if (todayTickets.length === 0) {
      setConfirmMessage('هیچ بلیطی برای امروز صادر نشده است');
      setConfirmAction(() => () => setShowConfirmModal(false));
      setShowConfirmModal(true);
      return;
    }

    setConfirmMessage(`آیا می‌خواهید ${todayTickets.length} بلیط امروز را حذف کنید؟`);
    setConfirmAction(() => () => resetTodayTickets(today, todayTickets.length));
    setShowConfirmModal(true);
  };

  // اجرای ریست روز
  const resetTodayTickets = async (today, count) => {
    try {
      console.log('Resetting tickets for:', today);
      const remainingTickets = tickets.filter(ticket => ticket.date !== today);
      console.log('Remaining tickets:', remainingTickets.length);
      
      setTickets(remainingTickets);
      await saveTickets(remainingTickets);
      setShowConfirmModal(false);
      
      // نمایش پیام موفقیت
      setConfirmMessage(`${count} بلیط امروز حذف شد`);
      setConfirmAction(() => () => setShowConfirmModal(false));
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Error resetting today:', error);
      setConfirmMessage('مشکلی در حذف بلیط‌ها رخ داد');
      setConfirmAction(() => () => setShowConfirmModal(false));
      setShowConfirmModal(true);
    }
  };

  // پاک کردن همه - تابع اصلی  
  const handleClearAll = () => {
    console.log('Clear All Button Clicked!');
    
    if (tickets.length === 0) {
      setConfirmMessage('هیچ بلیطی برای حذف وجود ندارد');
      setConfirmAction(() => () => setShowConfirmModal(false));
      setShowConfirmModal(true);
      return;
    }

    setConfirmMessage(`آیا می‌خواهید همه ${tickets.length} بلیط را حذف کنید؟`);
    setConfirmAction(() => () => clearAllTickets());
    setShowConfirmModal(true);
  };

  // اجرای پاک کردن همه
  const clearAllTickets = async () => {
    try {
      console.log('Clearing all tickets...');
      setTickets([]);
      await AsyncStorage.removeItem('tickets');
      setShowConfirmModal(false);
      
      // نمایش پیام موفقیت
      setConfirmMessage('همه بلیط‌ها حذف شدند');
      setConfirmAction(() => () => setShowConfirmModal(false));
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Error clearing all:', error);
      setConfirmMessage('مشکلی در حذف بلیط‌ها رخ داد');
      setConfirmAction(() => () => setShowConfirmModal(false));
      setShowConfirmModal(true);
    }
  };

  // حذف تکی بلیط
  const deleteSingleTicket = (ticketId) => {
    setConfirmMessage('آیا می‌خواهید این بلیط را حذف کنید؟');
    setConfirmAction(() => () => performDeleteSingleTicket(ticketId));
    setShowConfirmModal(true);
  };

  // اجرای حذف تکی
  const performDeleteSingleTicket = async (ticketId) => {
    try {
      const updatedTickets = tickets.filter(ticket => ticket.id !== ticketId);
      setTickets(updatedTickets);
      await saveTickets(updatedTickets);
      setShowConfirmModal(false);
    } catch (error) {
      console.error('Error deleting single ticket:', error);
      setConfirmMessage('مشکلی در حذف بلیط رخ داد');
      setConfirmAction(() => () => setShowConfirmModal(false));
      setShowConfirmModal(true);
    }
  };

  // فرمت کردن عدد با کاما
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // اضافه کردن تعداد
  const incrementQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  // کم کردن تعداد
  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const renderTicketTypeModal = () => (
    <Modal
      visible={showModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>انتخاب نوع بلیط</Text>
            <TouchableOpacity
              onPress={() => {
                setShowModal(false);
                setSelectedType(null);
                setQuantity(1);
                setCustomAmount('');
              }}
              style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.ticketGrid}>
              {ticketTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.ticketOption, 
                    {
                      backgroundColor: selectedType?.id === type.id ? type.color : '#f8f9fa',
                      borderColor: type.color,
                    }
                  ]}
                  onPress={() => setSelectedType(type)}>
                  <MaterialIcons 
                    name={type.icon} 
                    size={28} 
                    color={selectedType?.id === type.id ? '#fff' : type.color} 
                  />
                  <Text style={[
                    styles.ticketOptionName,
                    {color: selectedType?.id === type.id ? '#fff' : '#333'}
                  ]}>
                    {type.name}
                  </Text>
                  <Text style={[
                    styles.ticketOptionPrice,
                    {color: selectedType?.id === type.id ? '#fff' : '#666'}
                  ]}>
                    {type.price > 0 ? `${formatNumber(type.price)} تومان` : 'متغیر'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {selectedType && (
            <View style={styles.selectionContainer}>
              {/* انتخاب تعداد */}
              <View style={styles.quantityContainer}>
                <Text style={styles.quantityLabel}>تعداد:</Text>
                <View style={styles.quantityControls}>
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={decrementQuantity}>
                    <MaterialIcons name="remove" size={20} color="#1976D2" />
                  </TouchableOpacity>
                  <Text style={styles.quantityNumber}>{quantity}</Text>
                  <TouchableOpacity 
                    style={styles.quantityButton}
                    onPress={incrementQuantity}>
                    <MaterialIcons name="add" size={20} color="#1976D2" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ورودی مبلغ برای انواع خاص */}
              {['cash', 'buffet_card', 'buffet_cash'].includes(selectedType.id) && (
                <View style={styles.cashInputContainer}>
                  <Text style={styles.cashLabel}>
                    {selectedType.id === 'cash' ? 'مبلغ نقدی:' : 
                     selectedType.id === 'buffet_card' ? 'مبلغ کارتخوان بوفه:' : 
                     'مبلغ نقدی بوفه:'}
                  </Text>
                  <TextInput
                    style={styles.cashInput}
                    placeholder="مبلغ را به تومان وارد کنید"
                    value={customAmount}
                    onChangeText={(text) => {
                      // فقط عدد قبول کن
                      const numericValue = text.replace(/[^0-9]/g, '');
                      setCustomAmount(numericValue);
                    }}
                    keyboardType="numeric"
                  />
                </View>
              )}

              {/* خلاصه سفارش */}
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryText}>
                  {quantity} × {selectedType.name}
                </Text>
                <Text style={styles.summaryTotal}>
                  مجموع: {formatNumber(
                    (['cash', 'buffet_card', 'buffet_cash'].includes(selectedType.id) && customAmount 
                      ? parseInt(customAmount.replace(/,/g, '')) 
                      : selectedType.price) * quantity
                  )} تومان
                </Text>
              </View>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={issueTicket}>
                <MaterialIcons name="check-circle" size={24} color="#fff" />
                <Text style={styles.confirmButtonText}>صدور بلیط</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderReportModal = () => (
    <Modal
      visible={showReportModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowReportModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.reportModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>گزارش روزانه</Text>
            <TouchableOpacity
              onPress={() => setShowReportModal(false)}
              style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.reportDate}>تاریخ: {getCurrentPersianDate()}</Text>
            
            {Object.entries(reports).map(([key, value]) => {
              if (key === 'total') return null;
              return (
                <View key={key} style={[styles.reportItem, {borderLeftColor: value.color}]}>
                  <Text style={styles.reportItemName}>{key}</Text>
                  <View style={styles.reportItemValues}>
                    <Text style={styles.reportItemCount}>{value.count} عدد</Text>
                    <Text style={styles.reportItemAmount}>
                      {formatNumber(value.amount)} تومان
                    </Text>
                  </View>
                </View>
              );
            })}
            
            {reports.total && (
              <View style={styles.totalReport}>
                <Text style={styles.totalReportTitle}>مجموع کل:</Text>
                <Text style={styles.totalReportCount}>
                  {reports.total.count} بلیط
                </Text>
                <Text style={styles.totalReportAmount}>
                  {formatNumber(reports.total.amount)} تومان
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderConfirmModal = () => (
    <Modal
      visible={showConfirmModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowConfirmModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.confirmModalContent}>
          <MaterialIcons 
            name={confirmMessage.includes('حذف') ? "warning" : "info"} 
            size={48} 
            color={confirmMessage.includes('حذف') ? "#F44336" : "#2196F3"} 
          />
          <Text style={styles.confirmTitle}>تایید عملیات</Text>
          <Text style={styles.confirmMessage}>{confirmMessage}</Text>
          
          <View style={styles.confirmButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowConfirmModal(false)}>
              <Text style={styles.cancelButtonText}>لغو</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.confirmButton, styles.confirmActionButton]}
              onPress={() => {
                if (confirmAction) {
                  confirmAction();
                } else {
                  setShowConfirmModal(false);
                }
              }}>
              <Text style={styles.confirmButtonText}>
                {confirmMessage.includes('آیا') ? 'تایید' : 'باشه'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#1976D2" />
      
      {/* هدر */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏊‍♂️ دستیار پذیرش استخر</Text>
        <Text style={styles.headerSubtitle}>
          {getCurrentPersianDate()} - {getCurrentPersianTime()}
        </Text>
      </View>

      {/* آمار سریع */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <MaterialIcons name="confirmation-number" size={24} color="#1976D2" />
          <Text style={styles.statNumber}>{tickets.length}</Text>
          <Text style={styles.statLabel}>کل بلیط‌ها</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="today" size={24} color="#4CAF50" />
          <Text style={styles.statNumber}>
            {tickets.filter(t => t.date === getCurrentPersianDate()).length}
          </Text>
          <Text style={styles.statLabel}>امروز</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="attach-money" size={24} color="#FF5722" />
          <Text style={styles.statNumber}>
            {formatNumber(
              tickets
                .filter(t => t.date === getCurrentPersianDate())
                .reduce((sum, ticket) => sum + ticket.price, 0)
            )}
          </Text>
          <Text style={styles.statLabel}>درآمد امروز</Text>
        </View>
      </View>

      {/* دکمه‌های اصلی */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            console.log('New Ticket Button Clicked!');
            setShowModal(true);
          }}>
          <MaterialIcons name="add-circle" size={32} color="#fff" />
          <Text style={styles.primaryButtonText}>صدور بلیط جدید</Text>
        </TouchableOpacity>

        <View style={styles.secondaryButtonsRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, {flex: 1, marginRight: 8}]}
            onPress={() => {
              console.log('Report Button Pressed');
              generateReport();
            }}>
            <MaterialIcons name="assessment" size={24} color="#1976D2" />
            <Text style={styles.secondaryButtonText}>گزارش روزانه</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.resetButton, {flex: 1, marginLeft: 8}]}
            onPress={() => {
              console.log('Reset Button Pressed');
              handleResetToday();
            }}>
            <MaterialIcons name="refresh" size={24} color="#FF9800" />
            <Text style={styles.resetButtonText}>ریست امروز</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            console.log('Delete Button Pressed');
            handleClearAll();
          }}>
          <MaterialIcons name="delete" size={28} color="#F44336" />
          <Text style={styles.deleteButtonText}>پاک کردن همه</Text>
        </TouchableOpacity>
      </View>

      {/* آخرین بلیط‌ها */}
      <View style={styles.recentTicketsContainer}>
        <Text style={styles.sectionTitle}>آخرین بلیط‌های صادر شده</Text>
        <FlatList
          data={tickets.slice(-10).reverse()}
          renderItem={({item}) => (
            <View style={styles.ticketCard}>
              <View style={styles.ticketInfo}>
                <Text style={styles.ticketType}>{item.typeName}</Text>
                <Text style={styles.ticketDateTime}>{item.time} - {item.date}</Text>
              </View>
              <View style={styles.ticketRightSection}>
                <Text style={styles.ticketPrice}>
                  {formatNumber(item.price)} تومان
                </Text>
                <TouchableOpacity
                  style={styles.deleteTicketButton}
                  onPress={() => deleteSingleTicket(item.id)}>
                  <MaterialIcons name="delete" size={20} color="#F44336" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <Text style={styles.emptyText}>هنوز بلیطی صادر نشده است</Text>
          )}
        />
      </View>

      {renderTicketTypeModal()}
      {renderReportModal()}
      {renderConfirmModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1976D2',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E3F2FD',
    marginTop: 4,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  actionsContainer: {
    padding: 16,
  },
  primaryButton: {
    backgroundColor: '#1976D2',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryButtonsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1976D2',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  secondaryButtonText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  resetButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF9800',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  resetButtonText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  deleteButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F44336',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  recentTicketsContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  ticketCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketRightSection: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 50,
  },
  ticketType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  ticketDateTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  ticketPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '95%',
    maxHeight: '90%',
  },
  reportModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '70%',
  },
  confirmModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  reportDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    textAlign: 'center',
    marginBottom: 16,
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  ticketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  ticketOption: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 2,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    minHeight: 100,
    justifyContent: 'center',
  },
  ticketOptionName: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 6,
  },
  ticketOptionPrice: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  selectionContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  quantityNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    minWidth: 30,
    textAlign: 'center',
  },
  cashInputContainer: {
    marginBottom: 16,
  },
  cashLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cashInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  summaryContainer: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmActionButton: {
    backgroundColor: '#1976D2',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  reportItem: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  reportItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  reportItemValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reportItemCount: {
    fontSize: 14,
    color: '#666',
  },
  reportItemAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  totalReport: {
    backgroundColor: '#1976D2',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  totalReportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  totalReportCount: {
    fontSize: 16,
    color: '#E3F2FD',
    marginBottom: 4,
  },
  totalReportAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  confirmMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteTicketButton: {
    backgroundColor: '#ffebee',
    padding: 6,
    borderRadius: 6,
    marginTop: 4,
  },
});