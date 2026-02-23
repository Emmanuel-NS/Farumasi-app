import 'package:flutter/material.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:intl/intl.dart';
import '../../models/models.dart';
import '../../services/state_service.dart';

class PharmacistBookingScreen extends StatefulWidget {
  final Pharmacist pharmacist;

  const PharmacistBookingScreen({super.key, required this.pharmacist});

  @override
  State<PharmacistBookingScreen> createState() =>
      _PharmacistBookingScreenState();
}

class _PharmacistBookingScreenState extends State<PharmacistBookingScreen> {
  CalendarFormat _calendarFormat = CalendarFormat.twoWeeks; // Show only 2 weeks to focus on valid days
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;
  TimeOfDay? _selectedTime;
  final TextEditingController _noteController = TextEditingController();

  // Simulated Occupancy
  final Map<String, List<String>> _bookedSlots = {
    // Tomorrow example
    DateFormat('yyyy-MM-dd').format(DateTime.now().add(const Duration(days: 1))): ["09:00", "10:40", "14:00"],
    // Fully booked day example (Day after tomorrow)
    DateFormat('yyyy-MM-dd').format(DateTime.now().add(const Duration(days: 2))): 
      List.generate(18, (index) { // ~All slots
         int totalMin = 9 * 60 + (index * 25);
         int h = totalMin ~/ 60;
         int m = totalMin % 60;
         return "${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}";
      }),
  };

  @override
  void initState() {
    super.initState();
    _selectedDay = _focusedDay;
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  // 9:00 - 17:00, 20 min slot + 5 min break
  List<TimeOfDay> _generateDailySlots() {
    List<TimeOfDay> slots = [];
    TimeOfDay current = const TimeOfDay(hour: 9, minute: 0);
    TimeOfDay end = const TimeOfDay(hour: 17, minute: 0);
    
    int toMin(TimeOfDay t) => t.hour * 60 + t.minute;

    while (toMin(current) + 20 <= toMin(end)) {
      if (current.hour != 12) { // Lunch break 12-1
        slots.add(current);
      }
      int nextMin = toMin(current) + 25; // 20 min session + 5 min break
      current = TimeOfDay(hour: nextMin ~/ 60, minute: nextMin % 60);
    }
    return slots;
  }

  bool _isSlotTaken(DateTime date, TimeOfDay time) {
    String dateKey = DateFormat('yyyy-MM-dd').format(date);
    if (!_bookedSlots.containsKey(dateKey)) return false;
    
    String timeKey = "${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}";
    return _bookedSlots[dateKey]!.contains(timeKey);
  }

  // Returns: 'full', 'busy', 'available', 'weekend'
  String _getDayStatus(DateTime date) {
    if (date.weekday == DateTime.saturday || date.weekday == DateTime.sunday) return 'weekend';
    
    // Check if fully booked based on simulated "booked" map for testing
    // If the map has entries for this date, check count.
    
    // For demo: Generate slots and check against map
    List<TimeOfDay> all = _generateDailySlots();
    int taken = 0;
    for (var t in all) {
      if (_isSlotTaken(date, t)) taken++;
    }
    
    int available = all.length - taken;
    
    if (available == 0) return 'full';
    if (available <= 3) return 'busy'; // High demand
    return 'available';
  }

  bool _isDayFull(DateTime date) {
     final status = _getDayStatus(date);
     return status == 'full' || status == 'weekend';
  }

  // Helper function to build custom day cells
  Widget _buildDayCell(DateTime day, bool isSelected, {bool isToday = false}) {
    final status = _getDayStatus(day);
    
    // Base styles
    Color? bgColor;
    Color textColor = Colors.black87;
    BoxBorder? border;

    // 1. Determine Status Colors
    if (status == 'weekend') {
      textColor = Colors.grey.shade400; // Muted
    } else if (status == 'full') {
      bgColor = Colors.red.shade100; // Light red background
      textColor = Colors.red.shade900;
    } else if (status == 'busy') {
      bgColor = Colors.amber.shade100; // Yellow background
      textColor = Colors.amber.shade900;
    } else {
      // Normal 'available' day
      if (isToday) {
        bgColor = Colors.green.withOpacity(0.1);
        textColor = Colors.green;
      }
    }

    // 2. Override for Selection (keep status hint if possible, or override completely)
    if (isSelected) {
      if (status == 'available' || status == 'busy') {
         bgColor = Colors.green;
         textColor = Colors.white;
      } else if (status == 'full') {
         border = Border.all(color: Colors.red.shade900, width: 2);
      }
    }

    return Center(
      child: Container(
        decoration: BoxDecoration(
          color: bgColor,
          shape: BoxShape.circle,
          border: border,
        ),
        width: 35,
        height: 35,
        alignment: Alignment.center,
        child: Text(
          '${day.day}',
          style: TextStyle(
            color: textColor,
            fontWeight: (isSelected || isToday || status != 'available') ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("Book ${widget.pharmacist.name}"),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Calendar
          TableCalendar(
            firstDay: DateTime.now(),
            lastDay: DateTime.now().add(const Duration(days: 14)), // Restrict booking to 2 weeks
            focusedDay: _focusedDay,
            calendarFormat: _calendarFormat,
            availableCalendarFormats: const {
              CalendarFormat.twoWeeks: '2 Weeks',
              CalendarFormat.week: 'Week',
            }, // Disable Month format to prevent showing disabled days
            selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
            onDaySelected: (selectedDay, focusedDay) {
              if (!isSameDay(_selectedDay, selectedDay)) {
                setState(() {
                  _selectedDay = selectedDay;
                  _focusedDay = focusedDay;
                  _selectedTime = null; // Reset time
                });
              }
            },
            onFormatChanged: (format) {
              if (_calendarFormat != format) {
                setState(() {
                  _calendarFormat = format;
                });
              }
            },
            onPageChanged: (focusedDay) {
              _focusedDay = focusedDay;
            },
            calendarStyle: CalendarStyle(
              todayDecoration: BoxDecoration(
                color: Colors.green.withValues(alpha: 0.5),
                shape: BoxShape.circle,
              ),
              selectedDecoration: const BoxDecoration(
                color: Colors.green,
                shape: BoxShape.circle,
              ),
              // We'll customize each day using calendarBuilders below
            ),
            calendarBuilders: CalendarBuilders(
              // Handle default day cells
              defaultBuilder: (context, day, focusedDay) {
                return _buildDayCell(day, false);
              },
              // Handle selected day cells to keep status colors visible
              selectedBuilder: (context, day, focusedDay) {
                return _buildDayCell(day, true);
              },
              // Handle today cell
              todayBuilder: (context, day, focusedDay) {
                return _buildDayCell(day, false, isToday: true);
              },
            ),
          ),
          
          const Divider(),

          // Time Slots & Note
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_selectedDay != null) ...[
                    Text(
                      "Available Time Slots for ${DateFormat('MMM d, yyyy').format(_selectedDay!)}",
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(height: 10),
                    
                    if (_isDayFull(_selectedDay!))
                      Container(
                        padding: const EdgeInsets.all(12),
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.red.shade100),
                        ),
                        child: const Text(
                          "No available slots for this day. Please select another date.",
                          style: TextStyle(color: Colors.red),
                          textAlign: TextAlign.center,
                        ),
                      )
                    else 
                      Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        children: _generateDailySlots().map((time) {
                          final isTaken = _isSlotTaken(_selectedDay!, time);
                          final isSelected = _selectedTime == time;
                          
                          return InkWell(
                            onTap: isTaken ? null : () {
                              setState(() => _selectedTime = time);
                            },
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              width: 80,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              decoration: BoxDecoration(
                                color: isTaken 
                                  ? Colors.grey.shade200 
                                  : (isSelected ? Colors.green : Colors.white),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: isTaken 
                                    ? Colors.grey.shade400 
                                    : (isSelected ? Colors.green : Colors.grey.shade300),
                                ),
                              ),
                              child: Column(
                                children: [
                                  Text(
                                    time.format(context),
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: isTaken 
                                        ? Colors.grey 
                                        : (isSelected ? Colors.white : Colors.black87),
                                    ),
                                  ),
                                  if (isTaken)
                                    const Text(
                                      "Busy",
                                      style: TextStyle(fontSize: 10, color: Colors.grey),
                                    ),
                                ],
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                  ] else 
                    const Center(child: Text("Select a date to view available times.")),
                  
                  const SizedBox(height: 24),

                  // User Note Field
                  if (_selectedTime != null) ...[
                    const Text("Tell us about your concern (Optional):", style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _noteController,
                      maxLines: 3,
                      decoration: InputDecoration(
                        hintText: "E.g., I have a skin rash and fever...",
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        filled: true,
                        fillColor: Colors.grey.shade50,
                      ),
                    ),
                    const SizedBox(height: 24),
                    
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _confirmBooking,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text("Confirm Booking", style: TextStyle(color: Colors.white, fontSize: 16)),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _confirmBooking() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Confirm Appointment"),
        content: SingleChildScrollView(
          child: ListBody(
            children: [
              Text("Pharmacist: ${widget.pharmacist.name}"),
              const SizedBox(height: 8),
              Text("Date: ${DateFormat('MMM d, yyyy').format(_selectedDay!)}"),
              Text("Time: ${_selectedTime!.format(context)}"),
              const SizedBox(height: 8),
              if (_noteController.text.isNotEmpty)
                Text("Note: ${_noteController.text}", style: const TextStyle(fontStyle: FontStyle.italic)),
              const SizedBox(height: 16),
              const Text("You can cancel this appointment anytime from your profile.", style: TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text("Back")),
          ElevatedButton(
            onPressed: () {
              // Add to global state
              final booking = PharmacistBooking(
                id: DateTime.now().millisecondsSinceEpoch.toString(),
                pharmacistId: widget.pharmacist.id,
                pharmacistName: widget.pharmacist.name,
                date: _selectedDay!,
                time: _selectedTime!.format(context),
                notes: _noteController.text,
              );
              StateService().addBooking(booking);

              Navigator.of(ctx).pop(); // Close dialog
              Navigator.of(context).pop(); // Close screen
              
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text("Booking Confirmed! View in My Appointments."),
                  backgroundColor: Colors.green,
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
            child: const Text("Confirm"),
          ),
        ],
      ),
    );
  }
}
